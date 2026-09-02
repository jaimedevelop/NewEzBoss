import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { signOutClient, type ClientUser } from '../../../services/clients/client.auth';

interface ClientLayoutProps {
  clientUser: ClientUser;
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ clientUser, children }) => {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutClient();
      navigate('/client/login');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 flex-shrink-0 sticky top-0 z-30">
        <div className="px-4 h-14 flex items-center justify-between">
          <img src="/EzBossLogo2.png" alt="EzBoss" className="h-7" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-300 max-w-[40vw] truncate">{clientUser.name}</span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              aria-label="Sign out"
              className="flex items-center justify-center w-9 h-9 rounded-full text-slate-400 active:bg-slate-800 transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};

export default ClientLayout;
