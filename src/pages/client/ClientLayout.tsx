import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  FileText, 
  Settings, 
  Menu, 
  X,
  HardHat,
  LogOut
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const { signOut } = useAuthContext();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on window resize to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const navigation = [
    { name: 'My Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
    { name: 'Estimates', href: '/client/estimates', icon: FileText },
    { name: 'Projects', href: '/client/projects', icon: FolderOpen },
  ];

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <HardHat className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold text-gray-900">EzBoss <span className="text-orange-600 font-medium">Portal</span></span>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors duration-200"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-8 px-4 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <ul className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={`
                        group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                        ${isActive(item.href)
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-100'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-orange-600'
                        }
                      `}
                    >
                      <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                        isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-orange-600'
                      }`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-12 pt-4 border-t border-gray-100">
              <Link
                to="/client/settings"
                className={`
                  group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive('/client/settings')
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-100'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-orange-600'
                  }
                `}
              >
                <Settings className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                  isActive('/client/settings') ? 'text-white' : 'text-gray-400 group-hover:text-orange-600'
                }`} />
                Settings
              </Link>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full mt-2 group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-red-500 hover:bg-red-50 border-2 border-red-100 hover:border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="mr-3 h-5 w-5 transition-colors duration-200 text-red-500" />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 flex-shrink-0">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-xs text-gray-400">Version 1.26.4</p>
              <p className="text-xs text-gray-500 mt-1">© 2025 EzBoss Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile menu button - fixed position for mobile only */}
        <button
          className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md text-gray-500 hover:text-gray-700 transition-colors duration-200 border border-gray-100"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;
