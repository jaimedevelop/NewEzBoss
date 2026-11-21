import { useState } from 'react';
import { Database, RefreshCw } from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import WorkspaceTabBar from '../../mainComponents/ui/WorkspaceTabBar';
import DatabaseTables from './DatabaseTables';
import { useDatabaseTables } from './logic/useDatabaseTables';
import Releases from './views/Releases';

const tablesTab = { id: 'tables', label: 'Tables' } as const;
const releasesTab = { id: 'releases', label: 'Releases' } as const;

export default function DatabaseManagement() {
  const [tab, setTab] = useState<'tables' | 'releases'>('tables');
  const { isSuperuser } = useAuthContext();
  const activeTab = isSuperuser ? tab : 'tables';
  const tableData = useDatabaseTables(activeTab === 'tables');

  return (
    <div className="min-w-0 space-y-8">
      <VariableHeader
        title="Database Management"
        subtitle="Oversee Postgres tables and columns during the migration"
        Icon={Database}
        rightAction={activeTab === 'tables'
          ? { label: 'Refresh', onClick: tableData.reload, Icon: RefreshCw }
          : undefined}
      />
      <WorkspaceTabBar
        label="Database Management"
        tabs={isSuperuser ? [tablesTab, releasesTab] : [tablesTab]}
        activeTab={activeTab}
        onTabChange={setTab}
      />
      {activeTab === 'releases' ? <Releases /> : <DatabaseTables {...tableData} />}
    </div>
  );
}
