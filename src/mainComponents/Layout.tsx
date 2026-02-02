import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  FileText,
  DollarSign,
  Settings,
  Menu,
  X,
  HardHat,
  LayoutList,
  LogOut,
  User,
  ShoppingCart,
  ClipboardList
} from 'lucide-react';
import { useAuthContext } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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
      // Navigation to landing page will be handled automatically by auth state change
    } catch (error) {
      console.error('Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Finances', href: '/finances', icon: DollarSign },
    { name: 'Estimates', href: '/estimates', icon: FileText },
    { name: 'Purchasing', href: '/purchasing', icon: ShoppingCart },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardList },
    { name: 'Collections', href: '/collections', icon: LayoutList },
    { name: 'People', href: '/people', icon: User }
  ];

  const isActive = (path: string) => {
    // Exact match or starts with path/
    const baseMatch = location.pathname === path || location.pathname.startsWith(`${path}/`);

    // Special case for Inventory: also match /products, /labor, /tools, /equipment
    if (path === '/inventory') {
      const inventoryPaths = ['/products', '/labor', '/tools', '/equipment'];
      return baseMatch || inventoryPaths.some(p =>
        location.pathname === p || location.pathname.startsWith(`${p}/`)
      );
    }

    return baseMatch;
  };

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
                          ? 'bg-orange-600 text-white shadow-lg'
                          : 'text-gray-300 hover:bg-slate-800 hover:text-white'
                        }
                      `}
                    >
                      <Icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-white'
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
                <Settings className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive('/settings') ? 'text-white' : 'text-gray-400 group-hover:text-white'
                  }`} />
                Settings
              </Link>

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="w-full mt-2 group flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-red-500 hover:bg-slate-800 hover:text-red-400 border-2 border-red-600 hover:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut className="mr-3 h-5 w-5 transition-colors duration-200 text-red-500 group-hover:text-red-400" />
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 flex-shrink-0">
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-xs text-gray-400">Version 1.26.4</p>
              <p className="text-xs text-gray-500 mt-1">© 2025 EzBoss</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile menu button - fixed position for mobile only */}
        <button
          className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md text-gray-500 hover:text-gray-700 transition-colors duration-200"
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

export default Layout;