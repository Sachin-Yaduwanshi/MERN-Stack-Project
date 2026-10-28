import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Hotel, AlertCircle, ShieldAlert, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('GUEST'); // 'GUEST' or 'PROPERTY_OWNER'
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are mandatory.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (role === 'PLATFORM_ADMIN') {
      setError('Direct self-registration as Platform Admin is strictly disallowed.');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await register({ name, email, password, role });
      if (newUser.role === 'PROPERTY_OWNER') {
        navigate('/dashboard/owner');
      } else {
        navigate('/dashboard/guest');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-stone-50 dark:bg-stone-950 transition-colors">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
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
            Create your account
          </h2>
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
            Join StayPulse as a Guest or Property Partner.
          </p>
        </div>

        {/* Card */}
        <Card className="shadow-soft border-stone-200 dark:border-stone-800">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                Choose Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('GUEST')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'GUEST'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                  }`}
                >
                  <User className={`w-5 h-5 mb-1 ${role === 'GUEST' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`} />
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100">Guest</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">Book hotels & manage stays</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('PROPERTY_OWNER')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'PROPERTY_OWNER'
                      ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-2 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 bg-white dark:bg-stone-900'
                  }`}
                >
                  <Building2 className={`w-5 h-5 mb-1 ${role === 'PROPERTY_OWNER' ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400'}`} />
                  <div className="font-bold text-xs text-stone-900 dark:text-stone-100">Property Owner</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400">List hotels & rooms</div>
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              type="text"
              icon={User}
              placeholder="e.g. Rohit Kumar Singh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

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
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              icon={Lock}
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* Platform Admin Security Disclosure */}
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 text-[11px] text-stone-500 dark:text-stone-400 flex items-start gap-2 border border-stone-200 dark:border-stone-700">
              <ShieldAlert className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0 mt-0.5" />
              <span>
                <strong>Platform Security Policy:</strong> Admin roles cannot be created via public registration. Administrator accounts are provisioned exclusively via secure setup scripts.
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={UserPlus}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-stone-500 dark:text-stone-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300">
              Sign in here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
