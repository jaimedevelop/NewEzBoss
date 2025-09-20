import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Package, 
  FileText, 
  Settings, 
  Menu, 
  X,
  HardHat,
  LayoutList
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Estimates', href: '/estimates', icon: FileText },
    { name: 'Collections', href: '/collections', icon: LayoutList}
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 bg-slate-800 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <HardHat className="h-8 w-8 text-orange-500" />
              <span className="text-xl font-bold text-white">EzBoss</span>
            </div>
            <button
              className="lg:hidden text-gray-400 hover:text-white transition-colors duration-200"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-8 px-4 overflow-y-auto">
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
                          ? 'bg-orange-600 text-white shadow-lg'
                          : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                        }
                      `}
                    >
                      <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                        isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-white'
                      }`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-12 pt-4 border-t border-slate-700">
              <Link
                to="/settings"
                className={`
                  group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200
                  ${isActive('/settings')
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Settings className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                  isActive('/settings') ? 'text-white' : 'text-gray-400 group-hover:text-white'
                }`} />
                Settings
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 flex-shrink-0">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">Version 0.0.1</p>
              <p className="text-xs text-gray-500 mt-1">© 2025 EzBoss</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <button
                className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors duration-200"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-6 w-6" />
              </button>
              
              <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
                {navigation.find(item => isActive(item.href))?.name || 
                 (isActive('/settings') ? 'Settings' : 'Dashboard')}
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">JG</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">Joaquin Guerra</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;