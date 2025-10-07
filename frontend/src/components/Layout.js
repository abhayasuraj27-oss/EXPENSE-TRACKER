import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Upload, 
  Receipt, 
  BarChart3, 
  DollarSign,
  Moon,
  Sun
} from 'lucide-react';
import { useExpense } from '../context/ExpenseContext';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { myItemsThisMonthTotal } = useExpense();
  const { isAuthenticated, user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Transactions', href: '/transactions', icon: Receipt },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const getTotalSpent = () => myItemsThisMonthTotal || 0;

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      // default to system preference
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-2xl dark:bg-gray-900/90 border-r-2 border-gray-300 dark:border-gray-600 ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-800">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">ExpenseTracker</h1>
          </div>
          <button aria-label="Toggle dark mode" onClick={toggleTheme} className="btn-secondary p-2">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/30'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-colors ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Quick Stats */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-blue-100 p-4 shadow dark:from-blue-500/10 dark:to-blue-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">This Month</span>
              <span className="text-lg font-bold text-blue-900 dark:text-blue-200">
                ${getTotalSpent().toFixed(2)}
              </span>
            </div>
          </div>
          {isAuthenticated && (
            <div className="mt-3 flex">
              <button
                onClick={() => { logout(); navigate('/login'); }}
                className="btn-secondary w-full"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
