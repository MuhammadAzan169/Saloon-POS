import type { BaseRecord, ShopScoped } from './common';

export type SaleItemKind = 'service' | 'package' | 'product';

export interface SaleItem {
  id: string;
  kind: SaleItemKind;
  refId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  /** Per-line discount in currency units, already resolved from any percentage entry. */
  discount: number;
  /** Who performed or sold this line, for commission attribution. */
  staffId: string | null;
  lineTotal: number;
}

export type PaymentMethod = 'cash' | 'card' | 'bank-transfer' | 'other';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: number;
  /** Cash only: what the customer handed over, used to compute change. */
  tendered: number | null;
  reference: string | null;
}

export type SaleStatus = 'completed' | 'refunded';

export interface Sale extends BaseRecord, ShopScoped {
  receiptNo: string;
  customerId: string | null;
  /** Retained for walk-ins who have no customer record. */
  customerName: string;
  staffId: string | null;
  appointmentId: string | null;
  items: SaleItem[];
  subtotal: number;
  itemDiscountTotal: number;
  billDiscount: number;
  membershipDiscount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  payments: Payment[];
  changeGiven: number;
  status: SaleStatus;
  refundReason: string | null;
  refundedAt: string | null;
  soldAt: string;
  notes: string;
}
