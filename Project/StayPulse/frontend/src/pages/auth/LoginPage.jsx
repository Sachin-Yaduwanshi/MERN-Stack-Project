import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Hotel, AlertCircle, ArrowRight, ShieldCheck, User, Building2, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await login(email, password);
      // Redirect based on role
      if (loggedUser.role === 'PLATFORM_ADMIN') navigate('/dashboard/admin');
      else if (loggedUser.role === 'PROPERTY_OWNER') navigate('/dashboard/owner');
      else navigate('/dashboard/guest');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoRole) => {
    setIsLoading(true);
    setError('');
    try {
      let loggedUser;
      const candidates = (demoEmail === 'rohit@example.com' || demoEmail === 'sachin@example.com')
        ? ['rohit@example.com', 'sachin@example.com']
        : [demoEmail];

      let lastError;
      for (const email of candidates) {
        try {
          loggedUser = await login(email, 'Password123#', demoRole);
          break;
        } catch (e1) {
          try {
            loggedUser = await login(email, 'password123', demoRole);
            break;
          } catch (e2) {
            lastError = e2;
          }
        }
      }

      if (!loggedUser) throw lastError || new Error('Demo login failed');

      if (loggedUser.role === 'PLATFORM_ADMIN') navigate('/dashboard/admin');
      else if (loggedUser.role === 'PROPERTY_OWNER') navigate('/dashboard/owner');
      else navigate('/dashboard/guest');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50 dark:bg-stone-950 transition-colors">
      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              <Hotel className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              Stay<span className="text-emerald-600 dark:text-emerald-400">Pulse</span>
            </span>
          </Link>
          <h2 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            Sign in to your account
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Access your bookings, property management, or administrative dashboard.
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-soft border-stone-200 dark:border-stone-800">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={LogIn}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-stone-100 dark:border-stone-800">
            <span className="block text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2.5 text-center">
              Quick One-Click Demo Logins
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('rohit@example.com', 'GUEST')}
                className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 text-center transition-all group"
              >
                <User className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">Guest</span>
                <span className="block text-[10px] text-stone-400 dark:text-stone-500">Rohit</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('amit@staypulse.com', 'PROPERTY_OWNER')}
                className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/40 text-center transition-all group"
              >
                <Building2 className="w-4 h-4 mx-auto mb-1 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">Owner</span>
                <span className="block text-[10px] text-stone-400 dark:text-stone-500">Amit</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@staypulse.com', 'PLATFORM_ADMIN')}
                className="p-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/40 text-center transition-all group"
              >
                <Shield className="w-4 h-4 mx-auto mb-1 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="block text-xs font-bold text-stone-800 dark:text-stone-200">Admin</span>
                <span className="block text-[10px] text-stone-400 dark:text-stone-500">Sachin (Admin)</span>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center text-xs text-stone-500 dark:text-stone-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300">
              Create an account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
