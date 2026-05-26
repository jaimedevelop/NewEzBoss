import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

export interface GuestUser {
  name: string;
  email: string;
  role?: string; // e.g. 'Client', 'Employee', 'Inspector'
}

interface GuestLayoutProps {
  guestUser: GuestUser;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}

const GuestLayout: React.FC<GuestLayoutProps> = ({ guestUser, onSignOut, children }) => {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await onSignOut();
      navigate('/client/login');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-slate-900 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/EzBossLogo2.png" alt="EzBoss" className="h-8" />
            {guestUser.role && (
              <>
                <span className="text-slate-600 text-sm">|</span>
                <span className="text-sm text-slate-400">{guestUser.role} Portal</span>
              </>
            )}
          </div>

          {/* User + sign out */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-slate-300" />
              </div>
              <span className="hidden sm:inline text-sm text-slate-300">{guestUser.name}</span>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{signingOut ? 'Signing out…' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 py-3 text-center">
        <p className="text-xs text-gray-400">© 2026 EzBoss</p>
      </footer>
    </div>
  );
};

export default GuestLayout;