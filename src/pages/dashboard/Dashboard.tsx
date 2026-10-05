import { LayoutDashboard } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import RecentDocuments from './components/recentDocuments/createRecentDocuments';
import DashboardSchedule from './components/DashboardSchedule';
import DashboardAccounting from './components/DashboardAccounting';
import DashboardPersonnel from './components/DashboardPersonnel';

export default function Dashboard() {
  const { userProfile } = useAuthContext();
  const userName = userProfile?.firstName?.trim() || 'User';

  return (
    <div className="min-w-0 space-y-8">
      <VariableHeader
        title={`Welcome back, ${userName}!`}
        subtitle="Here's what's happening with your business today."
        Icon={LayoutDashboard}
        rightContent={
          <div className="text-right">
            <p className="text-sm text-orange-100">Today</p>
            <p className="text-xl font-semibold">
              {new Date().toLocaleDateString('en-US', {
                timeZone: userProfile?.timezone,
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentDocuments />
        </div>
        <div className="relative min-h-[28rem] min-w-0">
          <DashboardSchedule />
        </div>
      </div>

      <DashboardAccounting />
      <DashboardPersonnel />
    </div>
  );
}
