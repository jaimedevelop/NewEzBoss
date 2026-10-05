import PendingAccounts from './accounting/PendingAccounts';
import YourAccumulated from './accounting/YourAccumulated';
export default function DashboardAccounting() {
  return <section className="w-full space-y-4" aria-labelledby="dashboard-accounting-title">
    <h2 id="dashboard-accounting-title" className="text-xl font-semibold text-gray-900">Accounting</h2>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2"><PendingAccounts /><YourAccumulated /></div>
  </section>;
}
