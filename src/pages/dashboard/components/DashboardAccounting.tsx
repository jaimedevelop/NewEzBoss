import PendingAccounts from './accounting/PendingAccounts';
import YourAccumulated from './accounting/YourAccumulated';
export default function DashboardAccounting() {
  return <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="dashboard-accounting-title">
    <div className="relative rounded-t-xl border-b border-gray-200 bg-white pl-7 pr-4 py-2 sm:pl-8 sm:pr-6"><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-[linear-gradient(to_right,#f97316_0px,#f97316_10px,#ffffff_10px,#ffffff_12px,#f97316_12px,#f97316_14px,#ffffff_14px)] rounded-tl-xl" />
      <h2 id="dashboard-accounting-title" className="text-sm font-light uppercase tracking-wider text-black">Accounting</h2>
    </div>
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2"><PendingAccounts /><YourAccumulated /></div>
  </section>;
}
