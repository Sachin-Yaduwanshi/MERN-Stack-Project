import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, Building2, Shield, LogOut, ArrowRight, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function RoleSwitcherBanner() {
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="bg-stone-900 text-stone-200 border-b border-stone-800 text-xs py-2 px-4 shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-emerald-400 uppercase tracking-wider text-[10px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
            UI Dev Role Sandbox
          </span>
          <span className="text-stone-400 hidden sm:inline">Active Mode:</span>
          <span className="font-bold text-white bg-stone-800 px-2 py-0.5 rounded">
            {user ? `${user.name} (${user.role})` : 'Unauthenticated Visitor'}
          </span>
        </div>

        {/* Quick Role Switch Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => switchRole('GUEST')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              user?.role === 'GUEST'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            Guest
          </button>

          <button
            type="button"
            onClick={() => switchRole('PROPERTY_OWNER')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              user?.role === 'PROPERTY_OWNER'
                ? 'bg-emerald-600 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Building2 className="w-3 h-3" />
            Owner
          </button>

          <button
            type="button"
            onClick={() => switchRole('PLATFORM_ADMIN')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1 ${
              user?.role === 'PLATFORM_ADMIN'
                ? 'bg-amber-600 text-white'
                : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Shield className="w-3 h-3" />
            Admin
          </button>

          {user && (
            <button
              type="button"
              onClick={logout}
              className="px-2 py-1 rounded-md text-[11px] font-medium bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-900 transition-colors ml-1 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              Sign Out
            </button>
          )}

          {/* Quick Dashboard shortcut */}
          {user && (
            <Link
              to={
                user.role === 'PLATFORM_ADMIN'
                  ? '/dashboard/admin'
                  : user.role === 'PROPERTY_OWNER'
                  ? '/dashboard/owner'
                  : '/dashboard/guest'
              }
              className="ml-2 text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center gap-0.5 text-[11px]"
            >
              Go to Dashboard <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
