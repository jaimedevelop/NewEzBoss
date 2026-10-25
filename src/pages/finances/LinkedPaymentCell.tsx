import CellDetails from './CellDetails';
import { dateInput } from './dateTime';
import type { Field, PaymentSummary } from './ledger';

const money = (amount: number) => amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export function paymentCellText(summary: PaymentSummary, field: Field) {
  if (field === 'invoiceValue') return money(summary.total);
  if (field === 'payment') return money(summary.paid);
  if (field === 'paymentMethod') return [...new Set(summary.payments.map(payment => payment.method))].join(', ') || '—';
  return dateInput(summary.payments.at(-1)?.date ?? '') || '—';
}
export default function LinkedPaymentCell({ summary, field }: { summary: PaymentSummary; field: Field }) {
  const text = paymentCellText(summary, field);
  if (field === 'payment' || field === 'invoiceValue') {
    return <CellDetails value={text} overflowOnly><span className="block w-full truncate px-2 py-1 text-right font-semibold tabular-nums">{text}</span></CellDetails>;
  }
  const cell = <button type="button" className="block w-full truncate px-2 py-1 text-left" aria-label={field === 'paymentMethod' ? `Payment methods: ${text}` : `Payment date: ${text}`}>{text}</button>;
  if (field !== 'paymentMethod' || new Set(summary.payments.map(payment => payment.method.toLowerCase())).size <= 1) return <CellDetails value={text} overflowOnly>{cell}</CellDetails>;
  return <CellDetails value="Payment Methods" details={<div><p className="mb-2 font-semibold">Payment Methods</p><ul className="space-y-2">{summary.payments.map((payment, index) => <li key={index} className="text-xs"><span className="font-semibold">{payment.method}</span> · {money(payment.amount)} · {dateInput(payment.date) || '—'}</li>)}</ul></div>}>{cell}</CellDetails>;
}

export function PaymentStatus({ paid, total }: { paid: number; total: number | null }) {
  const status = paid <= 0 ? 'unpaid' : total !== null && total > 0 && Math.round(paid * 100) >= Math.round(total * 100) ? 'paid' : 'partial';
  const labels = { unpaid: 'Unpaid', partial: 'Partially paid', paid: 'Paid in full' };
  const colors = { unpaid: 'bg-red-500', partial: 'bg-yellow-400', paid: 'bg-green-500' };
  return <span role="img" aria-label={labels[status]} title={labels[status]} className={`mx-auto block h-3 w-3 rounded-full ${colors[status]}`} />;
}
