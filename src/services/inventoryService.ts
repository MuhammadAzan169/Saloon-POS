import type { InventoryMovement, MovementType, Product, StockStatus, User } from '@/types';
import { uid } from '@/utils/id';
import { round2 } from '@/utils/money';
import { commit, delay, nowISO, read, requireRow, scopeTo, ServiceError, stamped } from './db';
import { raise } from './notificationService';

/**
 * Every change to a stock figure goes through `applyMovement`, so the movement
 * log is a complete audit trail by construction — there is no way to change a
 * count without leaving a record of who did it and why.
 */

export function stockStatus(product: Pick<Product, 'stock' | 'minStock'>): StockStatus {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.minStock) return 'low';
  return 'in-stock';
}

export interface MovementInput {
  productId: string;
  type: MovementType;
  /** Signed: positive adds stock, negative removes it. */
  quantity: number;
  reason: string;
  referenceId?: string | null;
}

/**
 * Applies one movement inside an existing write. Returns the resulting row so
 * the caller can batch several movements into a single transaction (a sale
 * with three product lines writes three movements and one sale).
 */
export function applyMovementSync(
  db: { products: Product[]; inventoryMovements: InventoryMovement[] },
  input: MovementInput,
  actor: User,
): InventoryMovement {
  const product = db.products.find((p) => p.id === input.productId);
  if (!product) throw new ServiceError('That product could not be found.', 'not-found');

  const stockBefore = product.stock;
  const stockAfter = stockBefore + input.quantity;

  if (stockAfter < 0) {
    throw new ServiceError(
      `Only ${stockBefore} ${product.unit}${stockBefore === 1 ? '' : 's'} of ${product.name} left in stock.`,
      'insufficient-stock',
    );
  }

  const movement: InventoryMovement = stamped({
    id: uid('inv'),
    shopId: product.shopId,
    productId: product.id,
    type: input.type,
    quantity: input.quantity,
    stockBefore,
    stockAfter,
    reason: input.reason,
    referenceId: input.referenceId ?? null,
    userId: actor.id,
    userName: actor.name,
  });

  db.products = db.products.map((p) =>
    p.id === product.id ? { ...p, stock: stockAfter, updatedAt: nowISO() } : p,
  );
  db.inventoryMovements = [movement, ...db.inventoryMovements];

  return movement;
}

/**
 * Raise stock alerts after a write has landed. Kept separate from
 * `applyMovementSync` so notifications fire once per transaction, not once per
 * line, and only when a threshold is actually crossed.
 */
export function notifyStockThresholds(productIds: string[]): void {
  const db = read();
  for (const id of productIds) {
    const product = db.products.find((p) => p.id === id);
    if (!product || !product.active) continue;

    if (product.stock === 0) {
      raise({
        shopId: product.shopId,
        type: 'out-of-stock',
        title: 'Out of stock',
        message: `${product.brand} ${product.name} has run out. Reorder from ${product.supplier}.`,
        link: `/inventory?product=${product.id}`,
      });
    } else if (product.stock <= product.minStock) {
      raise({
        shopId: product.shopId,
        type: 'low-stock',
        title: 'Low stock',
        message: `${product.brand} ${product.name} is down to ${product.stock} ${product.unit}${
          product.stock === 1 ? '' : 's'
        } (minimum ${product.minStock}).`,
        link: `/inventory?product=${product.id}`,
      });
    }
  }
}

export async function applyMovement(input: MovementInput, actor: User): Promise<InventoryMovement> {
  const movement = await commit((db) => applyMovementSync(db, input, actor));
  notifyStockThresholds([input.productId]);
  return movement;
}

export async function addStock(
  productId: string,
  quantity: number,
  reason: string,
  actor: User,
): Promise<InventoryMovement> {
  if (quantity <= 0) throw new ServiceError('Enter a quantity greater than zero.', 'validation');
  return applyMovement({ productId, type: 'purchase', quantity, reason }, actor);
}

export async function removeStock(
  productId: string,
  quantity: number,
  reason: string,
  actor: User,
): Promise<InventoryMovement> {
  if (quantity <= 0) throw new ServiceError('Enter a quantity greater than zero.', 'validation');
  if (!reason.trim()) throw new ServiceError('A reason is required when removing stock.', 'validation');
  return applyMovement({ productId, type: 'service-use', quantity: -quantity, reason }, actor);
}

/**
 * Sets stock to an exact figure after a physical count. The movement records
 * the difference, so the log still reconciles.
 */
export async function adjustStock(
  productId: string,
  newStock: number,
  reason: string,
  actor: User,
): Promise<InventoryMovement> {
  if (!reason.trim()) throw new ServiceError('A reason is required for a stock adjustment.', 'validation');
  if (newStock < 0) throw new ServiceError('Stock cannot be negative.', 'validation');

  const product = requireRow(read().products.find((p) => p.id === productId), 'That product');
  const difference = newStock - product.stock;
  if (difference === 0) {
    throw new ServiceError('That is already the recorded stock level.', 'validation');
  }

  return applyMovement({ productId, type: 'adjustment', quantity: difference, reason }, actor);
}

export async function movementsFor(productId: string): Promise<InventoryMovement[]> {
  const rows = read().inventoryMovements.filter((m) => m.productId === productId);
  return delay([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function listMovements(shopId: string | null): Promise<InventoryMovement[]> {
  const rows = scopeTo(read().inventoryMovements, shopId);
  return delay([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export interface InventorySummary {
  totalItems: number;
  totalUnits: number;
  lowStock: number;
  outOfStock: number;
  valueAtCost: number;
  valueAtRetail: number;
  potentialMargin: number;
}

export function summarise(shopId: string | null): InventorySummary {
  const products = scopeTo(read().products, shopId).filter((p) => p.active);

  const valueAtCost = round2(products.reduce((sum, p) => sum + p.costPrice * p.stock, 0));
  const valueAtRetail = round2(products.reduce((sum, p) => sum + p.sellingPrice * p.stock, 0));

  return {
    totalItems: products.length,
    totalUnits: products.reduce((sum, p) => sum + p.stock, 0),
    lowStock: products.filter((p) => stockStatus(p) === 'low').length,
    outOfStock: products.filter((p) => stockStatus(p) === 'out').length,
    valueAtCost,
    valueAtRetail,
    potentialMargin: round2(valueAtRetail - valueAtCost),
  };
}

export function lowStockProducts(shopId: string | null): Product[] {
  return scopeTo(read().products, shopId)
    .filter((p) => p.active && stockStatus(p) !== 'in-stock')
    .sort((a, b) => a.stock - b.stock);
}
