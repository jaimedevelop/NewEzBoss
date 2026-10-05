import PendingAccounts from './accounting/PendingAccounts';
import YourAccumulated from './accounting/YourAccumulated';
export default function DashboardAccounting() {
  return <section className="w-full min-w-0 rounded-xl border border-gray-200 bg-white shadow-sm" aria-labelledby="dashboard-accounting-title">
    <div className="rounded-t-xl border-b border-orange-500 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 sm:px-6">
      <h2 id="dashboard-accounting-title" className="text-base font-semibold text-white">Accounting</h2>
    </div>
    <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-2"><PendingAccounts /><YourAccumulated /></div>
  </section>;
}
