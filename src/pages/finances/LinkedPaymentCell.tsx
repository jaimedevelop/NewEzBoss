import CellDetails from './CellDetails';
import { dateInput } from './dateTime';
import type { Field, PaymentSummary } from './ledger';

const money = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export function paymentCellText(summary: PaymentSummary, field: Field) {
  if (field === 'payment') return money(summary.paid);
  if (field === 'paymentMethod') return [...new Set(summary.payments.map(payment => payment.method))].join(', ') || '—';
  return dateInput(summary.payments.at(-1)?.date ?? '') || '—';
}
export default function LinkedPaymentCell({ summary, field }: { summary: PaymentSummary; field: Field }) {
  const text = paymentCellText(summary, field);
  if (field === 'payment') {
    const colors = { unpaid: 'bg-red-50 text-red-700', partial: 'bg-yellow-50 text-yellow-800', paid: 'bg-green-50 text-green-700' };
    const status = { unpaid: 'Unpaid', partial: 'Partially paid', paid: 'Paid in full' };
    return <CellDetails value={text} overflowOnly><span tabIndex={0} className={`block w-full truncate px-2 py-1 text-right font-semibold tabular-nums ${colors[summary.status]}`} title={`${status[summary.status]}: ${money(summary.paid)} of ${money(summary.total)}`} aria-label={`${status[summary.status]}: ${money(summary.paid)} of ${money(summary.total)}`}>{text}</span></CellDetails>;
  }
  const cell = <button type="button" className="block w-full truncate px-2 py-1 text-left" aria-label={field === 'paymentMethod' ? `Payment methods: ${text}` : `Payment date: ${text}`}>{text}</button>;
  if (field !== 'paymentMethod' || new Set(summary.payments.map(payment => payment.method.toLowerCase())).size <= 1) return <CellDetails value={text} overflowOnly>{cell}</CellDetails>;
  return <CellDetails value="Payment Methods" details={<div><p className="mb-2 font-semibold">Payment Methods</p><ul className="space-y-2">{summary.payments.map((payment, index) => <li key={index} className="text-xs"><span className="font-semibold">{payment.method}</span> · {money(payment.amount)} · {dateInput(payment.date) || '—'}</li>)}</ul></div>}>{cell}</CellDetails>;
}
