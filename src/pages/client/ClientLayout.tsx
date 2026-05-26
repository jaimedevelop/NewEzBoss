import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { signOutClient, type ClientUser } from '../../services/clients/clientAuth';

interface ClientLayoutProps {
  clientUser: ClientUser;
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ clientUser, children }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOutClient();
      navigate('/client/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">E</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">EzBoss</span>
            <span className="text-gray-300 text-sm mx-1">|</span>
            <span className="text-sm text-gray-500">Client Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
              <span className="hidden sm:inline">{clientUser.name}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default ClientLayout;