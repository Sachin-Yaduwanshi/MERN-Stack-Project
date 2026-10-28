import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Hotel,
  Compass,
  Shield,
  KeyRound,
  Menu,
  X,
  ArrowRight,
  User,
  LogOut,
  LayoutDashboard,
  Building2,
  CalendarCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'PLATFORM_ADMIN') return '/dashboard/admin';
    if (user.role === 'PROPERTY_OWNER') return '/dashboard/owner';
    return '/dashboard/guest';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                Stay<span className="text-emerald-600 dark:text-emerald-400">Pulse</span>
              </span>
              <span className="hidden sm:block text-[11px] font-medium tracking-wide uppercase text-stone-500 dark:text-stone-400">
                Smart Stays & Property SaaS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100/70 dark:bg-stone-800/80 p-1.5 rounded-full border border-stone-200/60 dark:border-stone-700/60">
            <Link
              to="/hotels"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive('/hotels')
                  ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              Explore Hotels
            </Link>
            <Link
              to="/#roles"
              className="px-4 py-2 rounded-full text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Role Architecture
            </Link>
            {user?.role === 'PROPERTY_OWNER' && (
              <Link
                to="/dashboard/owner/properties"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/dashboard/owner')
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                My Hotels
              </Link>
            )}
            {user?.role === 'GUEST' && (
              <Link
                to="/dashboard/guest/bookings"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/dashboard/guest')
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                My Bookings
              </Link>
            )}
          </nav>

          {/* Right Action buttons */}
          <div className="hidden md:flex items-center gap-3">
            {/* Global Light / Dark Theme Toggle */}
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-3">
                <Link to={getDashboardPath()}>
                  <Button variant="outline" size="sm" icon={LayoutDashboard}>
                    {user.role === 'PLATFORM_ADMIN'
                      ? 'Admin Dashboard'
                      : user.role === 'PROPERTY_OWNER'
                      ? 'Owner Dashboard'
                      : 'Guest Portal'}
                  </Button>
                </Link>

                {/* User chip */}
                <div className="flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-stone-700">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs border border-emerald-300 dark:border-emerald-700">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link to="/register" className="text-sm font-semibold text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 px-3 py-2 transition-colors">
                  List Your Property
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm" icon={ArrowRight}>
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Right Controls: Theme Toggle & Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/hotels"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-stone-900 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800"
          >
            Explore Hotels
          </Link>
          <div className="flex items-center justify-between px-3 py-2 border-t border-b border-stone-100 dark:border-stone-800 my-1">
            <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Theme</span>
            <ThemeToggle showLabel />
          </div>
          {user ? (
            <>
              <Link
                to={getDashboardPath()}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                Go to Dashboard ({user.role})
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Sign Out ({user.name})
              </button>
            </>
          ) : (
            <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-center">
                  Log In
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="primary" className="w-full justify-center">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
