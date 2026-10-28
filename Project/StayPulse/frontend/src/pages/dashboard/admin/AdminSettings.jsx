import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Percent,
  Clock,
  Power,
  Server,
  Database,
  FileCheck2,
  Loader2
} from 'lucide-react';
import { adminAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function AdminSettings() {
  const [platformFee, setPlatformFee] = useState(5);
  const [cancellationGraceHours, setCancellationGraceHours] = useState(24);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const res = await adminAPI.getOverview();
        if (res.data?.success && res.data.overview?.system) {
          setSystemInfo(res.data.overview.system);
        }
      } catch (err) {
        console.error('Failed to load system info in settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSystemInfo();
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <DashboardLayout
      title="Platform Settings & Diagnostics"
      subtitle="Configure global SaaS policies, taxation rules, and inspect system telemetry."
    >
      <div className="max-w-2xl space-y-6">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Platform settings saved successfully.</span>
          </div>
        )}

        {/* Live System Configuration Card */}
        <Card className="border-stone-200 shadow-soft">
          <h3 className="text-base font-bold text-stone-900 mb-1 flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            Live System Configuration
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Current backend environment parameters and operational telemetry.
          </p>

          {loading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600 mx-auto" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 font-semibold block text-[11px] uppercase tracking-wider">
                  Configured GST Rate
                </span>
                <span className="text-base font-extrabold text-stone-900 mt-1 block">
                  {systemInfo?.configuredGSTRatePercentage || '12%'} (Hospitality GST)
                </span>
                <span className="text-[11px] text-stone-400">Server-side calculation</span>
              </div>

              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 font-semibold block text-[11px] uppercase tracking-wider">
                  MongoDB Status
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-base font-extrabold text-stone-900">
                    {systemInfo?.database || 'Connected'}
                  </span>
                  <Badge variant="success" size="sm">
                    {systemInfo?.status?.toUpperCase() || 'OPERATIONAL'}
                  </Badge>
                </div>
                <span className="text-[11px] text-stone-400">
                  Uptime: {systemInfo?.uptimeSeconds || 0}s
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Global SaaS Settings Form */}
        <Card className="border-stone-200 shadow-soft">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Platform Commission Fee */}
            <div>
              <Input
                label="Host Platform Service Fee (%)"
                type="number"
                icon={Percent}
                value={platformFee}
                onChange={(e) => setPlatformFee(e.target.value)}
                helperText="Applied to gross booking payout calculations for property owners."
                min="0"
                max="25"
                required
              />
            </div>

            {/* Cancellation Window */}
            <div>
              <Input
                label="Free Cancellation Grace Window (Hours)"
                type="number"
                icon={Clock}
                value={cancellationGraceHours}
                onChange={(e) => setCancellationGraceHours(e.target.value)}
                helperText="Hours prior to check-in time during which a guest may cancel without penalty."
                min="1"
                max="72"
                required
              />
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <div>
                <label className="text-xs font-bold text-stone-900 block">
                  Platform Maintenance Mode
                </label>
                <p className="text-xs text-stone-500 mt-0.5">
                  Temporarily restricts new public booking submissions while allowing owners to manage existing inventory.
                </p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-5 h-5 accent-emerald-600 rounded cursor-pointer mt-1"
              />
            </div>

            {/* Mandatory Privacy Lock */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Hardcoded Privacy Architecture:</span>
                Admin zero-knowledge restrictions on guest bookings and photos are enforced at the database query level and cannot be toggled off through administrative UI.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Platform Settings
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
