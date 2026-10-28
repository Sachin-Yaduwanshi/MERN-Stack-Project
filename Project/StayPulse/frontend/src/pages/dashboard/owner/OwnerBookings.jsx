import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Building2,
  Users,
  Clock,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Eye,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { bookingsAPI, propertiesAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

export default function OwnerBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [myProperties, setMyProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetchOwnerData = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsRes, propertiesRes] = await Promise.all([
        bookingsAPI.getOwnerBookings(),
        propertiesAPI.getMyProperties(),
      ]);

      if (bookingsRes.data?.success && bookingsRes.data.bookings) {
        setBookings(bookingsRes.data.bookings);
      }
      if (propertiesRes.data?.success && propertiesRes.data.properties) {
        setMyProperties(propertiesRes.data.properties);
      }
    } catch (err) {
      console.error('Failed to load owner bookings:', err);
      setError(err.response?.data?.message || 'Failed to retrieve property reservations from the database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOwnerData();
  }, []);

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

  const filteredBookings = bookings.filter((b) =>
    statusFilter === 'ALL' ? true : b.status === statusFilter
  );

  const handleUpdateStatus = async (bookingId, newStatus) => {
    setUpdatingStatus(true);
    setError('');
    try {
      const res = await bookingsAPI.updateStatus(bookingId, newStatus);
      if (res.data?.success && res.data.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
        );
        if (selectedBooking && selectedBooking._id === bookingId) {
          setSelectedBooking((prev) => ({ ...prev, status: newStatus }));
        }
        setFeedback(`Reservation status successfully updated to ${newStatus}.`);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.message || 'Could not update reservation status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <DashboardLayout
      title="Property Guest Bookings"
      subtitle="Manage check-ins, guest stays, and reservations for your properties."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchOwnerData}
          disabled={loading}
        >
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Strict Isolation Notice */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-soft flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-stone-600">
            <span className="font-bold text-stone-900 block mb-0.5">
              Strict Multi-Owner Booking Boundary
            </span>
            You are viewing reservations exclusively for your registered properties (
            {myProperties.map((h) => h.name).join(', ') || 'Your Properties'}). Bookings made at
            other owners' properties are completely inaccessible by design.
          </div>
        </div>

        {/* Feedback / Notification Banner */}
        {feedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
            <button
              onClick={() => setFeedback('')}
              className="font-bold text-emerald-900 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="font-bold text-rose-900 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Filter buttons */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
          {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === tab
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {tab === 'ALL' ? 'All Bookings' : tab}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-500 font-medium">Loading property reservations from MongoDB...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center">
            <CalendarCheck className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h4 className="text-base font-bold text-stone-900">No reservations found</h4>
            <p className="text-xs text-stone-500 mt-1">
              Reservations placed by guests on your properties will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const propName = b.property?.name || 'Property';
              const rType = b.room?.roomType || 'Standard Room';
              const guestName = b.guest?.name || 'Guest';
              const guestPhone = b.guest?.phone || 'Not provided';

              return (
                <Card key={b._id} className="border-stone-200 shadow-soft">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            b.status === 'CONFIRMED'
                              ? 'success'
                              : b.status === 'COMPLETED'
                              ? 'default'
                              : 'danger'
                          }
                          size="sm"
                          dot
                        >
                          {b.status}
                        </Badge>
                        <span className="text-xs font-mono font-medium text-stone-400">
                          {b.bookingReference}
                        </span>
                        <span className="text-xs text-stone-400">•</span>
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                          {propName}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900">
                        {guestName}{' '}
                        <span className="text-xs font-normal text-stone-500">
                          ({b.guestsCount} {b.guestsCount === 1 ? 'Guest' : 'Guests'})
                        </span>
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                          {rType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)} ({b.nights} nights)
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          {guestPhone}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between lg:justify-end gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                      <div className="lg:text-right">
                        <span className="text-[11px] text-stone-400 block font-medium">Total Booking Value</span>
                        <span className="text-base font-extrabold text-stone-900">
                          ₹{b.totalPrice.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => setSelectedBooking(b)}
                        >
                          View & Manage
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Details & Status Management Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="Guest Reservation Management"
          subtitle={`Reference: ${selectedBooking.bookingReference}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {/* Guest details */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-bold text-stone-800 block uppercase tracking-wider text-[10px]">
                Guest Information
              </span>
              <div className="flex justify-between">
                <span className="text-stone-500">Guest Name:</span>
                <span className="font-bold text-stone-900">{selectedBooking.guest?.name || 'Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Contact Email:</span>
                <span className="font-medium text-stone-800">{selectedBooking.guest?.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Contact Phone:</span>
                <span className="font-medium text-stone-800">{selectedBooking.guest?.phone || 'Not provided'}</span>
              </div>
            </div>

            {/* Stay details */}
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <span className="font-bold text-stone-800 block uppercase tracking-wider text-[10px]">
                Stay Details
              </span>
              <div className="flex justify-between">
                <span className="text-stone-500">Hotel:</span>
                <span className="font-bold text-stone-900">{selectedBooking.property?.name || 'Property'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Room Type:</span>
                <span className="font-semibold text-stone-800">{selectedBooking.room?.roomType || 'Room'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-In:</span>
                <span className="font-semibold text-stone-800">{formatDate(selectedBooking.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-Out:</span>
                <span className="font-semibold text-stone-800">{formatDate(selectedBooking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Stay Duration:</span>
                <span className="font-semibold text-stone-800">{selectedBooking.nights} nights</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-stone-200">
                <span className="font-bold text-stone-900">Total Price:</span>
                <span className="font-bold text-emerald-700">₹{selectedBooking.totalPrice.toLocaleString('en-IN')}</span>
              </div>
              {selectedBooking.status === 'CANCELLED' && selectedBooking.cancellationReason && (
                <div className="flex justify-between text-rose-700 pt-1 border-t border-stone-200">
                  <span className="font-medium">Cancellation Reason:</span>
                  <span className="font-semibold">{selectedBooking.cancellationReason}</span>
                </div>
              )}
            </div>

            {/* Status updates */}
            <div>
              <span className="font-bold text-stone-800 block uppercase tracking-wider text-[10px] mb-2">
                Update Status
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant={selectedBooking.status === 'CONFIRMED' ? 'primary' : 'outline'}
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus(selectedBooking._id, 'CONFIRMED')}
                >
                  Confirmed
                </Button>
                <Button
                  size="sm"
                  variant={selectedBooking.status === 'COMPLETED' ? 'primary' : 'outline'}
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus(selectedBooking._id, 'COMPLETED')}
                >
                  Completed
                </Button>
                <Button
                  size="sm"
                  variant={selectedBooking.status === 'CANCELLED' ? 'danger' : 'outline'}
                  disabled={updatingStatus}
                  onClick={() => handleUpdateStatus(selectedBooking._id, 'CANCELLED')}
                >
                  Cancelled
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
