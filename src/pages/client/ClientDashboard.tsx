import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  Plus,
  FolderOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const ClientDashboard: React.FC = () => {
  // Demo data for placeholder
  const activeEstimates = [
    { id: '1', number: 'EST-2025-001', contractor: 'Elite Construction', total: 12500, date: '2025-01-20', status: 'pending' },
    { id: '2', number: 'EST-2025-014', contractor: 'Quick Fix Plumbing', total: 450, date: '2025-01-24', status: 'viewed' },
  ];

  const recentProjects = [
    { id: '1', name: 'Kitchen Remodel', contractor: 'Elite Construction', progress: 65, status: 'In Progress' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-200">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">Welcome back!</h2>
          <p className="text-orange-100 max-w-md">
            Here's what's happening with your home projects and estimates.
          </p>
        </div>
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-orange-500 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 translate-y-12 translate-x-12 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
      </div>

      {/* Stats / Quick Lookup */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-orange-50 shadow-sm flex items-center space-x-4">
          <div className="bg-orange-50 p-3 rounded-xl">
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Estimates</p>
            <p className="text-2xl font-bold text-slate-800">{activeEstimates.length}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-orange-50 shadow-sm flex items-center space-x-4">
          <div className="bg-orange-50 p-3 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Projects</p>
            <p className="text-2xl font-bold text-slate-800">{recentProjects.length}</p>
          </div>
        </div>

        <Link to="/client/estimates/new" className="bg-white p-6 rounded-2xl border-2 border-dashed border-orange-200 hover:border-orange-400 transition-colors flex items-center justify-center space-x-3 group text-orange-600">
           <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
           <span className="font-semibold text-lg">New Request</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Active Estimates */}
        <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden text-sm">
          <div className="px-6 py-5 border-b border-orange-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Recent Estimates</h3>
            <Link to="/client/estimates" className="text-orange-600 font-medium hover:underline flex items-center">
                View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-orange-50">
            {activeEstimates.map(est => (
              <div key={est.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-center justify-between group">
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{est.number}</p>
                  <p className="text-slate-500 flex items-center">
                    <span className="font-medium text-slate-700 mr-2">{est.contractor}</span>
                    • {est.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">${est.total.toLocaleString()}</p>
                  <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    est.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {est.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Active Projects */}
        <div className="bg-white rounded-3xl border border-orange-50 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-orange-50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">My Projects</h3>
            <Link to="/client/projects" className="text-orange-600 font-medium hover:underline flex items-center">
                Details <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="p-6">
            {recentProjects.map(proj => (
              <div key={proj.id} className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{proj.name}</h4>
                    <p className="text-slate-500 text-sm">{proj.contractor}</p>
                  </div>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    {proj.status}
                  </span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-500">Progress</span>
                        <span className="text-orange-600">{proj.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-orange-600 rounded-full transition-all duration-1000" 
                            style={{ width: `${proj.progress}%` }}
                        ></div>
                    </div>
                </div>
              </div>
            ))}
            {recentProjects.length === 0 && (
                <div className="text-center py-8">
                    <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">No active projects yet</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
