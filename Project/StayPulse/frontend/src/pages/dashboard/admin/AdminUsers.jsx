import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  EyeOff,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { adminAPI } from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (search.trim()) params.search = search.trim();

      const res = await adminAPI.getUsers(params);
      if (res.data?.success && res.data.users) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
      setError('Could not retrieve registered users from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const toggleUserStatus = async (id, currentStatus) => {
    if (currentAdmin?._id === id || currentAdmin?.id === id) {
      setError('You cannot suspend your own administrative account.');
      setTimeout(() => setError(''), 4000);
      return;
    }

    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setUpdatingId(id);
    setFeedback('');
    setError('');

    try {
      const res = await adminAPI.updateUserStatus(id, newStatus);
      if (res.data?.success && res.data.user) {
        setUsers((prev) =>
          prev.map((u) => (u._id === id ? { ...u, status: newStatus } : u))
        );
        setFeedback(`User account status updated to ${newStatus}.`);
        setTimeout(() => setFeedback(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
      setError(err.response?.data?.message || 'Failed to update user status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
  };

  return (
    <DashboardLayout
      title="User Account Management"
      subtitle="Administrative oversight of registered guest and owner accounts."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchUsers}
          disabled={loading}
        >
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Privacy Disclosure */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <EyeOff className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p>
            <strong>Privacy Protection Enforced:</strong> In compliance with security rules, guest profile photos, individual travel histories, and private booking records are suppressed from platform administrative tables.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            {['ALL', 'GUEST', 'PROPERTY_OWNER', 'PLATFORM_ADMIN'].map((rf) => (
              <button
                key={rf}
                onClick={() => setRoleFilter(rf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  roleFilter === rf
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {rf === 'ALL'
                  ? 'All Accounts'
                  : rf === 'GUEST'
                  ? 'Guests'
                  : rf === 'PROPERTY_OWNER'
                  ? 'Property Owners'
                  : 'Admins'}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <Card padding={false} className="border-stone-200 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-stone-500">Retrieving users from database...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              No registered user accounts found matching the filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Assigned Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Account Created</th>
                    <th className="p-4 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {users.map((u) => {
                    const isSelf = currentAdmin?._id === u._id || currentAdmin?.id === u._id;
                    return (
                      <tr key={u._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-xs">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <span className="font-bold text-stone-900 block">
                                {u.name} {isSelf && '(You)'}
                              </span>
                              <span className="text-[11px] text-stone-400 font-mono">{u._id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-stone-700 font-medium">{u.email}</td>
                        <td className="p-4">
                          <Badge
                            variant={
                              u.role === 'PLATFORM_ADMIN'
                                ? 'danger'
                                : u.role === 'PROPERTY_OWNER'
                                ? 'info'
                                : 'default'
                            }
                            size="sm"
                          >
                            {u.role}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={u.status === 'ACTIVE' ? 'success' : 'error'}
                            size="sm"
                          >
                            {u.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-stone-500">{formatDate(u.createdAt)}</td>
                        <td className="p-4 text-right">
                          {isSelf ? (
                            <span className="text-[11px] text-stone-400 italic">Self Account</span>
                          ) : (
                            <Button
                              variant={u.status === 'ACTIVE' ? 'outline' : 'primary'}
                              size="sm"
                              disabled={updatingId === u._id}
                              onClick={() => toggleUserStatus(u._id, u.status)}
                            >
                              {updatingId === u._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : u.status === 'ACTIVE' ? (
                                'Suspend Account'
                              ) : (
                                'Reactivate'
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
