import { useEffect, useMemo, useState } from 'react';
import { Banknote, CreditCard, Landmark, MoreHorizontal, Split } from 'lucide-react';
import type { Payment, PaymentMethod, Sale } from '@/types';
import { cn } from '@/utils/cn';
import { formatCurrency, round2 } from '@/utils/money';
import { uid } from '@/utils/id';
import { useDb } from '@/hooks/useDb';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { calculateBill, paidTotal } from '@/services/pricing';
import * as saleService from '@/services/saleService';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';

const METHODS: { value: PaymentMethod; label: string; icon: JSX.Element }[] = [
  { value: 'cash', label: 'Cash', icon: <Banknote /> },
  { value: 'card', label: 'Card', icon: <CreditCard /> },
  { value: 'bank-transfer', label: 'Bank transfer', icon: <Landmark /> },
  { value: 'other', label: 'Other', icon: <MoreHorizontal /> },
];

/** Common note denominations, so cash can be taken in two taps. */
const QUICK_CASH = [500, 1000, 2000, 5000];

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  shopId: string;
  onComplete: (sale: Sale) => void;
}

export function PaymentModal({
  open,
  onClose,
  shopId,
  onComplete,
}: PaymentModalProps): JSX.Element {
  const db = useDb();
  const cart = useCartStore();
  const actor = useAuthStore((s) => s.user);

  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [tendered, setTendered] = useState('');
  const [splitMode, setSplitMode] = useState(false);
  const [splits, setSplits] = useState<Payment[]>([]);
  const [notes, setNotes] = useState('');

  const totals = useMemo(
    () =>
      calculateBill({
        items: cart.items,
        billDiscount: cart.billDiscount,
        membershipDiscountPct: cart.customer.membershipDiscountPct,
        taxRatePct: db.settings.billing.taxRatePct,
      }),
    [cart.items, cart.billDiscount, cart.customer.membershipDiscountPct, db.settings.billing.taxRatePct],
  );

  // Start each payment fresh, with the exact amount pre-filled for cash.
  useEffect(() => {
    if (!open) return;
    setMethod('cash');
    setTendered(String(totals.total));
    setSplitMode(false);
    setSplits([]);
    setNotes('');
  }, [open, totals.total]);

  const tenderedNum = Number(tendered) || 0;
  const change = method === 'cash' ? round2(Math.max(0, tenderedNum - totals.total)) : 0;
  const shortBy = method === 'cash' ? round2(Math.max(0, totals.total - tenderedNum)) : 0;

  const splitPaid = paidTotal(splits);
  const splitRemaining = round2(Math.max(0, totals.total - splitPaid));

  const canPay = splitMode ? splitPaid >= totals.total : method !== 'cash' || tenderedNum >= totals.total;

  const checkout = useAsyncAction(
    async () => {
      if (!actor) throw new Error('You must be signed in to take payment.');

      const payments: Payment[] = splitMode
        ? splits
        : [
            {
              id: uid('pay'),
              method,
              amount: totals.total,
              tendered: method === 'cash' ? tenderedNum : null,
              reference: null,
            },
          ];

      return saleService.checkout(
        {
          shopId,
          customerId: cart.customer.id,
          customerName: cart.customer.name || 'Walk-in customer',
          staffId: cart.staffId,
          appointmentId: cart.appointmentId,
          items: cart.items,
          billDiscount: cart.billDiscount,
          payments,
          notes,
        },
        actor,
      );
    },
    {
      successMessage: (sale) => `Payment taken — receipt ${sale.receiptNo}.`,
      onSuccess: (sale) => {
        cart.clear();
        onComplete(sale);
      },
    },
  );

  const addSplit = (splitMethod: PaymentMethod, amount: number): void => {
    if (amount <= 0) return;
    setSplits((current) => [
      ...current,
      {
        id: uid('pay'),
        method: splitMethod,
        amount: round2(Math.min(amount, splitRemaining)),
        tendered: null,
        reference: null,
      },
    ]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!checkout.pending}
      title="Take payment"
      description={`${cart.items.length} ${cart.items.length === 1 ? 'item' : 'items'} for ${
        cart.customer.name || 'a walk-in customer'
      }`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={checkout.pending}>
            Back to cart
          </Button>
          <Button
            size="lg"
            loading={checkout.pending}
            disabled={!canPay}
            onClick={() => void checkout.run()}
          >
            Complete sale · {formatCurrency(totals.total)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* ---- Amount due ---- */}
        <div className="rounded-2xl bg-brand p-5 text-center text-brand-ink">
          <p className="text-xs uppercase tracking-wide opacity-75">Amount due</p>
          <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
            {formatCurrency(totals.total)}
          </p>
          {totals.totalDiscount > 0 && (
            <p className="mt-1 text-xs opacity-75">
              {formatCurrency(totals.totalDiscount)} discounted
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-ink">Payment method</p>
          <button
            type="button"
            onClick={() => {
              setSplitMode((v) => !v);
              setSplits([]);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
              splitMode
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-line text-muted hover:border-subtle hover:text-ink',
            )}
          >
            <Split className="h-3.5 w-3.5" aria-hidden />
            Split payment
          </button>
        </div>

        {/* ---- Single payment ---- */}
        {!splitMode && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METHODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={method === option.value}
                  onClick={() => setMethod(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors',
                    method === option.value
                      ? 'border-brand bg-brand text-brand-ink'
                      : 'border-line bg-surface text-muted hover:border-brand hover:text-ink',
                  )}
                >
                  <span className="[&>svg]:h-5 [&>svg]:w-5" aria-hidden>
                    {option.icon}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>

            {method === 'cash' && (
              <div className="space-y-3">
                <Input
                  label="Amount received"
                  type="number"
                  min={0}
                  step={50}
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  error={shortBy > 0 ? `Short by ${formatCurrency(shortBy)}` : undefined}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTendered(String(totals.total))}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:bg-brand-soft"
                  >
                    Exact
                  </button>

                  {QUICK_CASH.filter((note) => note >= totals.total).slice(0, 3).map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setTendered(String(note))}
                      className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium tabular-nums text-ink transition-colors hover:border-brand hover:bg-brand-soft"
                    >
                      {formatCurrency(note)}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setTendered(String(Math.ceil(totals.total / 500) * 500))}
                    className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-brand hover:bg-brand-soft"
                  >
                    Round up
                  </button>
                </div>

                <div
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3.5 py-3',
                    change > 0 ? 'bg-ok-soft' : 'bg-canvas',
                  )}
                >
                  <span className="text-sm font-medium text-ink">Change to give</span>
                  <span
                    className={cn(
                      'font-display text-xl font-semibold tabular-nums',
                      change > 0 ? 'text-ok' : 'text-muted',
                    )}
                  >
                    {formatCurrency(change)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- Split payment ---- */}
        {splitMode && (
          <div className="space-y-3">
            {splits.length > 0 && (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {splits.map((split) => (
                  <li key={split.id} className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex-1 text-sm capitalize text-ink">
                      {split.method.replace('-', ' ')}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-ink">
                      {formatCurrency(split.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSplits((c) => c.filter((p) => p.id !== split.id))}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div
              className={cn(
                'flex items-center justify-between rounded-xl px-3.5 py-2.5',
                splitRemaining === 0 ? 'bg-ok-soft' : 'bg-warn-soft',
              )}
            >
              <span className="text-[13px] font-medium text-ink">Still to pay</span>
              <span className="text-sm font-semibold tabular-nums text-ink">
                {formatCurrency(splitRemaining)}
              </span>
            </div>

            {splitRemaining > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-medium text-ink">Add a payment</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {METHODS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => addSplit(option.value, splitRemaining)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-line px-2 py-3 text-xs font-medium text-muted transition-colors hover:border-brand hover:bg-brand-soft hover:text-ink"
                    >
                      <span className="[&>svg]:h-5 [&>svg]:w-5" aria-hidden>
                        {option.icon}
                      </span>
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-subtle">
                  Tapping a method adds the full remaining balance. Remove and re-add to change it.
                </p>
              </div>
            )}
          </div>
        )}

        <Textarea
          label="Notes (optional)"
          placeholder="Anything to record against this bill"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </Modal>
  );
}
