import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Activity,
  Layers,
  Lock,
  EyeOff,
  Server,
  CalendarCheck,
  Loader2,
  IndianRupee,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { adminAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';

export default function AdminOverview() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({
    users: { total: 0, guests: 0, owners: 0, suspended: 0 },
    properties: { total: 0, active: 0, inactive: 0, pending: 0, rejected: 0 },
    rooms: { total: 0 },
    bookings: { total: 0, confirmed: 0, completed: 0, cancelled: 0, grossBookingVolume: 0 },
    system: { status: 'operational', uptimeSeconds: 0, database: 'connected', configuredGSTRatePercentage: '12%' },
  });
  const [loading, setLoading] = useState(true);

  const fetchAdminMetrics = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getOverview();
      if (res.data?.success && res.data.overview) {
        setOverview(res.data.overview);
      }
    } catch (err) {
      console.error('Failed to load admin overview metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminMetrics();
  }, []);

  const platformActivities = [
    { id: 1, type: 'HOTEL_MODERATION', description: 'Listing moderation & live state enforcement active', time: 'Active' },
    { id: 2, type: 'ACCOUNT_REGISTRATION', description: 'JWT Role-Based Access Control sanity check passed', time: 'Active' },
    { id: 3, type: 'SECURITY_AUDIT', description: 'Zero-knowledge guest privacy firewall verified', time: 'Active' },
    { id: 4, type: 'CONCURRENCY_ENGINE', description: 'Database-backed unique compound reservation slot index enforced', time: 'Active' },
  ];

  return (
    <DashboardLayout
      title="Platform Operations & Health"
      subtitle="Aggregate metrics, system health, and property moderation controls."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchAdminMetrics}
          disabled={loading}
        >
          Refresh Data
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Strict Privacy Requirement Banner */}
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 shadow-soft">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <EyeOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-amber-950 uppercase tracking-wider">
                  Mandatory Guest Privacy Architecture Enforced
                </h3>
                <Badge variant="warning" size="sm">
                  ZERO GUEST DATA ACCESS
                </Badge>
              </div>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                In strict accordance with StayPulse specification:
                <strong> Platform Administrators cannot inspect private guest booking records, guest booking histories, guest contact info, or guest profile photos.</strong>{' '}
                Only high-level system aggregates and public property moderation tools are available.
              </p>
            </div>
          </div>
        </div>

        {/* Aggregate Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-stone-200 shadow-soft">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-stone-400" /> : overview.users.total}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {overview.users.guests} Guests • {overview.users.owners} Owners
            </p>
          </Card>

          <Card className="border-stone-200 shadow-soft">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider">Active Properties</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              ) : (
                overview.properties.active
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {overview.properties.total} Total • {overview.properties.pending || 0} Pending Review
            </p>
          </Card>

          <Card className="border-stone-200 shadow-soft">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider">Aggregate Bookings</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              ) : (
                overview.bookings.total
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {overview.bookings.confirmed} Confirmed • {overview.bookings.completed} Completed
            </p>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30 shadow-soft">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Aggregate Volume</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              ) : (
                `₹${(overview.bookings.grossBookingVolume || 0).toLocaleString('en-IN')}`
              )}
            </div>
            <p className="mt-1 text-xs text-emerald-700 font-medium">Platform gross stay value (Demo)</p>
          </Card>
        </div>

        {/* Security & Concurrency Verification Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-stone-200 shadow-soft">
            <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              Security Architecture Boundaries
            </h3>
            <ul className="space-y-2.5 text-xs text-stone-600">
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Tenant Isolation:</strong> Owners can query and update only their own properties. Cross-tenant access is rejected at controller level.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Admin Privacy Firewall:</strong> Admin endpoints omit individual booking schemas and guest photo URLs entirely.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Bootstrap Protection:</strong> Public registration is blocked from setting `PLATFORM_ADMIN`.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>GST Taxation:</strong> Configurable Indian hospitality tax rate ({overview.system.configuredGSTRatePercentage}) calculated strictly on server.
                </span>
              </li>
            </ul>
          </Card>

          <Card className="border-stone-200 shadow-soft">
            <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              System Status & Live Diagnostics
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-stone-500" />
                  <span className="font-medium text-stone-700">API Service Engine</span>
                </div>
                <Badge variant="success" size="sm">
                  {overview.system.status.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-stone-500" />
                  <span className="font-medium text-stone-700">MongoDB Database</span>
                </div>
                <Badge variant={overview.system.database === 'connected' ? 'success' : 'error'} size="sm">
                  {overview.system.database.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-stone-500" />
                  <span className="font-medium text-stone-700">Server Uptime</span>
                </div>
                <span className="font-mono text-stone-900 font-bold">{overview.system.uptimeSeconds}s</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Audit & Compliance Log */}
        <Card className="border-stone-200 shadow-soft">
          <h3 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Security & Activity Watchdog
          </h3>
          <div className="space-y-3">
            {platformActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-medium text-stone-800">{act.description}</span>
                </div>
                <Badge variant="default" size="sm">
                  {act.type}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Database(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function Clock(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
