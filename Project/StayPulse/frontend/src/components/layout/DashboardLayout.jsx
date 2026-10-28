import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  CalendarCheck,
  User,
  Shield,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function DashboardLayout({ children, title, subtitle, actions }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-soft text-center">
          <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-900">Authentication Required</h2>
          <p className="text-stone-600 text-sm mt-2 mb-6">
            Please log in to access this portal.
          </p>
          <Link to="/login">
            <Button variant="primary" className="w-full">
              Proceed to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const role = user.role;

  // Sidebar items based on role
  let navItems = [];
  if (role === 'GUEST') {
    navItems = [
      { name: 'Overview', path: '/dashboard/guest', icon: LayoutDashboard },
      { name: 'My Bookings', path: '/dashboard/guest/bookings', icon: CalendarCheck },
      { name: 'Profile & Privacy', path: '/dashboard/guest/profile', icon: User },
    ];
  } else if (role === 'PROPERTY_OWNER') {
    navItems = [
      { name: 'Overview', path: '/dashboard/owner', icon: LayoutDashboard },
      { name: 'My Properties', path: '/dashboard/owner/properties', icon: Building2 },
      { name: 'Rooms Inventory', path: '/dashboard/owner/rooms', icon: BedDouble },
      { name: 'Property Bookings', path: '/dashboard/owner/bookings', icon: CalendarCheck },
      { name: 'Profile & Host View', path: '/dashboard/owner/profile', icon: User },
    ];
  } else if (role === 'PLATFORM_ADMIN') {
    navItems = [
      { name: 'Platform Overview', path: '/dashboard/admin', icon: LayoutDashboard },
      { name: 'Manage Users', path: '/dashboard/admin/users', icon: Users },
      { name: 'Property Moderation', path: '/dashboard/admin/properties', icon: Building2 },
      { name: 'Platform Settings', path: '/dashboard/admin/settings', icon: Settings },
    ];
  }

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-stone-100/70 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col md:flex-row transition-colors">
      {/* Mobile Sidebar Trigger */}
      <div className="md:hidden bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          className="flex items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200"
        >
          <Menu className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span>Dashboard Menu</span>
        </button>
        <Badge variant={role === 'PLATFORM_ADMIN' ? 'warning' : 'brand'} size="sm">
          {role}
        </Badge>
      </div>

      {/* Sidebar */}
      <aside
        className={`${
          mobileSidebarOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-white dark:bg-stone-900 border-r border-stone-200/90 dark:border-stone-800 shrink-0 flex flex-col`}
      >
        {/* Role Identity Tag */}
        <div className="p-5 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200 dark:border-emerald-700">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">{user.name}</h4>
              <Badge
                variant={role === 'PLATFORM_ADMIN' ? 'warning' : 'brand'}
                size="sm"
                className="mt-1"
              >
                {role === 'PLATFORM_ADMIN' ? 'ADMIN' : role === 'PROPERTY_OWNER' ? 'OWNER' : 'GUEST'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Strict privacy indicator for Admin */}
        {role === 'PLATFORM_ADMIN' && (
          <div className="m-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 leading-tight">
            <span className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-400 mb-1">
              <Shield className="w-3.5 h-3.5" /> Privacy Shield Active
            </span>
            Guest private bookings and photos are hidden from Admin by system design.
          </div>
        )}

        {/* Footer controls */}
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 px-2 py-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Site</span>
          </Link>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 px-2 py-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
        </div>

        {/* Child Views */}
        {children}
      </main>
    </div>
  );
}
