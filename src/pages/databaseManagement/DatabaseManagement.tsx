import { useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import DatabaseTables from './DatabaseTables';
import Releases from './views/Releases';

export default function DatabaseManagement() {
  const [tab, setTab] = useState('tables');
  const { isSuperuser } = useAuthContext();
  return <div className="space-y-6">
    <nav aria-label="Database management" className="flex gap-3 border-b border-gray-200">
      {['tables', ...(isSuperuser ? ['releases'] : [])].map(name => <button key={name}
        aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}
        className={`px-4 py-3 capitalize ${tab === name ? 'border-b-2 border-blue-600 text-blue-700 font-semibold' : 'text-gray-600'}`}>
        {name}</button>)}
    </nav>
    {tab === 'releases' && isSuperuser ? <Releases /> : <DatabaseTables />}
  </div>;
}
