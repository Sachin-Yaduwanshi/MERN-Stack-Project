import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  MapPin,
  SlidersHorizontal,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileText,
  Check,
  X
} from 'lucide-react';
import { adminAPI, getMediaUrl } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

export default function AdminProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('APPLICATIONS'); // 'APPLICATIONS' | 'ALL'
  const [filterCity, setFilterCity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  // Rejection Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filterCity !== 'ALL') params.city = filterCity;
      if (activeTab === 'APPLICATIONS') {
        params.status = 'PENDING_APPROVAL';
      } else if (filterStatus !== 'ALL') {
        params.status = filterStatus;
      }

      const res = await adminAPI.getProperties(params);
      if (res.data?.success && res.data.properties) {
        setProperties(res.data.properties);
      }
    } catch (err) {
      console.error('Failed to load admin properties:', err);
      setError('Could not retrieve hotel listings from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [activeTab, filterCity, filterStatus]);

  const handleApprove = async (property) => {
    setUpdatingId(property._id);
    setFeedback('');
    setError('');

    try {
      const res = await adminAPI.updatePropertyStatus(property._id, 'ACTIVE');
      if (res.data?.success) {
        setFeedback(`Property "${property.name}" approved and activated for public booking.`);
        fetchProperties();
        setTimeout(() => setFeedback(''), 4500);
      }
    } catch (err) {
      console.error('Failed to approve property:', err);
      setError(err.response?.data?.message || 'Failed to approve property.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openRejectModal = (property) => {
    setSelectedProperty(property);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!selectedProperty) return;

    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting this property application.');
      return;
    }

    setRejecting(true);
    try {
      const res = await adminAPI.updatePropertyStatus(
        selectedProperty._id,
        'REJECTED',
        rejectionReason.trim()
      );
      if (res.data?.success) {
        setFeedback(`Property "${selectedProperty.name}" rejected. Feedback saved for owner.`);
        setRejectModalOpen(false);
        fetchProperties();
        setTimeout(() => setFeedback(''), 4500);
      }
    } catch (err) {
      console.error('Failed to reject property:', err);
      setError(err.response?.data?.message || 'Failed to reject property.');
    } finally {
      setRejecting(false);
    }
  };

  const toggleActiveInactive = async (id, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setUpdatingId(id);
    setFeedback('');
    setError('');

    try {
      const res = await adminAPI.updatePropertyStatus(id, newStatus);
      if (res.data?.success) {
        setFeedback(`Listing status updated to ${newStatus}.`);
        fetchProperties();
        setTimeout(() => setFeedback(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update property status:', err);
      setError(err.response?.data?.message || 'Failed to update property status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success" size="sm">ACTIVE / LIVE</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning" size="sm">PENDING APPROVAL</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">REJECTED</Badge>;
      case 'INACTIVE':
      default:
        return <Badge variant="secondary" size="sm">INACTIVE</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="Property Applications & Moderation"
      subtitle="Review pending property applications, verify host information, and approve or reject listings."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchProperties}
          disabled={loading}
        >
          Refresh Data
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
            <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Workflow Tab Navigation */}
        <div className="flex border-b border-stone-200 gap-4">
          <button
            onClick={() => setActiveTab('APPLICATIONS')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'APPLICATIONS'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Property Applications (Pending Review)</span>
            {activeTab === 'APPLICATIONS' && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                {properties.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>All Platform Listings</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-stone-500 uppercase mr-1">Location:</span>
            {['ALL', 'Jaipur', 'Goa', 'Manali', 'Udaipur'].map((city) => (
              <button
                key={city}
                onClick={() => setFilterCity(city)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  filterCity === city
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {city === 'ALL' ? 'All Locations' : city}
              </button>
            ))}
          </div>

          {activeTab === 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase mr-1">Status:</span>
              {['ALL', 'ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filterStatus === st
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section Context Header */}
        {activeTab === 'APPLICATIONS' ? (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Administrator Approval Queue</span>
              <p className="mt-0.5 text-stone-600">
                Newly submitted properties are held in <strong>PENDING_APPROVAL</strong> state. They are completely hidden from public search and cannot be booked until you review and approve them.
              </p>
            </div>
          </div>
        ) : null}

        {/* Properties Table */}
        <Card padding={false} className="border-stone-200 shadow-soft overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-stone-500">Retrieving listings from database...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              {activeTab === 'APPLICATIONS'
                ? 'No pending property applications awaiting review. All listings are processed!'
                : 'No properties matched the selected moderation filter.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Property</th>
                    <th className="p-4">Location</th>
                    <th className="p-4">Registered Host</th>
                    <th className="p-4">Rooms</th>
                    <th className="p-4">Starting Rate</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {properties.map((p) => (
                    <tr key={p._id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getMediaUrl(p.coverImage)}
                            alt={p.name}
                            className="w-12 h-10 rounded-lg object-cover bg-stone-100 shrink-0"
                          />
                          <div>
                            <span className="font-bold text-stone-900 block">{p.name}</span>
                            <span className="text-[11px] text-stone-400 font-mono">{p._id}</span>
                            {p.rejectionReason && (
                              <div className="mt-1 text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 inline-block">
                                Reason: {p.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-stone-700">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {p.location?.city || p.city}, {p.location?.state || p.state}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-stone-900">{p.owner?.name || 'Owner'}</div>
                        <div className="text-stone-400 text-[11px]">{p.owner?.email}</div>
                        {p.owner?.phone && (
                          <div className="text-stone-400 text-[10px]">{p.owner.phone}</div>
                        )}
                      </td>
                      <td className="p-4 font-bold text-stone-800">
                        {p.roomCount !== undefined ? p.roomCount : '–'} room(s)
                      </td>
                      <td className="p-4 font-bold text-stone-900">
                        ₹{(p.startingPrice || 0).toLocaleString('en-IN')}/night
                      </td>
                      <td className="p-4">
                        {getStatusBadge(p.status)}
                      </td>
                      <td className="p-4 text-right">
                        {p.status === 'PENDING_APPROVAL' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={Check}
                              disabled={updatingId === p._id}
                              onClick={() => handleApprove(p)}
                            >
                              {updatingId === p._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                'Approve'
                              )}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={X}
                              disabled={updatingId === p._id}
                              onClick={() => openRejectModal(p)}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : p.status === 'REJECTED' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={updatingId === p._id}
                              onClick={() => handleApprove(p)}
                            >
                              {updatingId === p._id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                'Re-evaluate & Approve'
                              )}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant={p.status === 'ACTIVE' ? 'outline' : 'primary'}
                            size="sm"
                            disabled={updatingId === p._id}
                            onClick={() => toggleActiveInactive(p._id, p.status)}
                          >
                            {updatingId === p._id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : p.status === 'ACTIVE' ? (
                              'Deactivate'
                            ) : (
                              'Reactivate'
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Reject Reason Modal */}
      {selectedProperty && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Property Application"
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              <span className="font-bold">Rejecting: {selectedProperty.name}</span>
              <p className="mt-0.5 text-rose-700">
                The listing will remain unavailable for public search and bookings. Please enter a clear rejection reason so host <strong>{selectedProperty.owner?.name}</strong> can address the feedback.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Rejection Reason / Host Feedback
              </label>
              <textarea
                rows={3}
                required
                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 focus:outline-none focus:border-rose-600"
                placeholder="e.g. Incomplete address documentation, low resolution photography, or missing commercial hospitality license."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-stone-400 block w-full">Quick Suggestions:</span>
              {[
                'Missing verification documentation.',
                'Property photography fails quality standards.',
                'Starting rate does not align with regional room standards.',
                'Address details incomplete or unverifiable.',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setRejectionReason(template)}
                  className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 py-1 rounded transition-colors"
                >
                  {template}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(false)}
                disabled={rejecting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={rejecting}
              >
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
