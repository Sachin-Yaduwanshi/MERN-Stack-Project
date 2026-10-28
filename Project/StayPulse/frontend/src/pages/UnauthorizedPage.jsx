import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-stone-50">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-soft text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-stone-900">403 — Access Denied</h1>
        <p className="text-sm text-stone-600 mt-2">
          Your current account role <span className="font-bold text-stone-900">({user?.role || 'Visitor'})</span> does not have authorization to view this resource.
        </p>
        <p className="text-xs text-stone-400 mt-1">
          StayPulse strictly isolates Guest, Property Owner, and Platform Administrator privileges on both client and backend routes.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/">
            <Button variant="primary" size="md" className="w-full" icon={ArrowLeft}>
              Return to Safe Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
