import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  MapPin,
  Clock,
  Building2,
  Users,
  Eye,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Loader2,
  RefreshCw,
  Compass
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { bookingsAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';

export default function GuestBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [cancelError, setCancelError] = useState('');

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await bookingsAPI.getMyBookings();
      if (res.data?.success && Array.isArray(res.data.bookings)) {
        setBookings(res.data.bookings);
      } else {
        setBookings([]);
      }
    } catch (err) {
      console.error('Failed to load guest bookings:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired or authentication token is missing. Please sign in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch your reservations from the server.');
      }
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
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

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'CONFIRMED') return b.status === 'CONFIRMED';
    if (activeTab === 'COMPLETED') return b.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return b.status === 'CANCELLED';
    return true;
  });

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setCancellingLoading(true);
    setCancelError('');

    try {
      const res = await bookingsAPI.cancel(cancellingBooking._id, cancelReason);
      if (res.data?.success && res.data.booking) {
        setBookings((prev) =>
          prev.map((b) => (b._id === cancellingBooking._id ? res.data.booking : b))
        );
        setCancelFeedback(`Reservation ${cancellingBooking.bookingReference} has been successfully cancelled.`);
        setCancellingBooking(null);
        setSelectedBooking(null);
        setCancelReason('');
      } else {
        setCancelError(res.data?.message || 'Failed to cancel reservation.');
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      setCancelError(err.response?.data?.message || 'Could not cancel booking. Check cancellation policy.');
    } finally {
      setCancellingLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="My Reservations"
      subtitle="View, track, or cancel eligible bookings for your account."
      actions={
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchBookings}
          disabled={loading}
        >
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Cancellation Notice Banner */}
        {cancelFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{cancelFeedback}</span>
            </div>
            <button
              onClick={() => setCancelFeedback('')}
              className="font-bold text-emerald-900 dark:text-emerald-200 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchBookings}
                className="font-bold text-rose-900 dark:text-rose-200 hover:underline"
              >
                Retry
              </button>
              <button
                onClick={() => setError('')}
                className="font-medium text-rose-700 dark:text-rose-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
          {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
              }`}
            >
              {tab === 'ALL' ? 'All Bookings' : tab}
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Loading your reservations from MongoDB...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 text-center">
            <CalendarCheck className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
            <h4 className="text-base font-bold text-stone-800 dark:text-stone-100">
              {activeTab === 'ALL'
                ? 'No reservations found'
                : `No ${activeTab.toLowerCase()} reservations found`}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-4">
              {activeTab === 'ALL'
                ? 'Any booking you reserve will automatically appear in this isolated portal.'
                : `You currently have no reservations marked as ${activeTab}.`}
            </p>
            <Link to="/hotels">
              <Button variant="primary" size="sm" icon={Compass}>
                Explore Hotels
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const propName = b.property?.name || b.hotelName || 'Property';
              const propCity = b.property?.location?.city || b.property?.city || b.hotelCity || 'Location';
              const rType = b.room?.roomType || b.roomType || 'Standard Room';
              const formattedPrice = Number(b.totalPrice ?? 0).toLocaleString('en-IN');

              return (
                <Card key={b._id} className="border-stone-200 dark:border-stone-800 shadow-soft">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left Info */}
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
                        <span className="text-xs font-mono font-medium text-stone-500 dark:text-stone-400">
                          {b.bookingReference}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{propName}</h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 dark:text-stone-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {propCity}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {formatDate(b.checkInDate)} → {formatDate(b.checkOutDate)} ({b.nights} {b.nights === 1 ? 'night' : 'nights'})
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {rType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {b.guestsCount} Guests
                        </span>
                      </div>
                    </div>

                    {/* Right Actions & Pricing */}
                    <div className="flex items-center justify-between lg:justify-end gap-5 pt-4 lg:pt-0 border-t lg:border-t-0 border-stone-100 dark:border-stone-800">
                      <div className="lg:text-right">
                        <span className="text-[11px] text-stone-400 dark:text-stone-500 block font-medium">Total Price</span>
                        <span className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
                          ₹{formattedPrice}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => setSelectedBooking(b)}
                        >
                          Details
                        </Button>

                        {b.status === 'CONFIRMED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={XCircle}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => {
                              setCancelError('');
                              setCancelReason('');
                              setCancellingBooking(b);
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title="Reservation Details"
          subtitle={`Reference: ${selectedBooking.bookingReference}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Property:</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {selectedBooking.property?.name || selectedBooking.hotelName || 'Property'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Location:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {selectedBooking.property?.location?.city || selectedBooking.property?.city || selectedBooking.hotelCity || 'India'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Room Category:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {selectedBooking.room?.roomType || selectedBooking.roomType || 'Room'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Check-In:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{formatDate(selectedBooking.checkInDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Check-Out:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">{formatDate(selectedBooking.checkOutDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Duration & Guests:</span>
                <span className="font-semibold text-stone-800 dark:text-stone-200">
                  {selectedBooking.nights} nights • {selectedBooking.guestsCount} guests
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500 dark:text-stone-400">Current Status:</span>
                <Badge
                  variant={
                    selectedBooking.status === 'CONFIRMED'
                      ? 'success'
                      : selectedBooking.status === 'COMPLETED'
                      ? 'default'
                      : 'danger'
                  }
                  size="sm"
                >
                  {selectedBooking.status}
                </Badge>
              </div>
              {selectedBooking.status === 'CANCELLED' && selectedBooking.cancellationReason && (
                <div className="flex justify-between text-rose-700 dark:text-rose-400 pt-1 border-t border-stone-200 dark:border-stone-700">
                  <span className="font-medium">Cancellation Reason:</span>
                  <span className="font-semibold">{selectedBooking.cancellationReason}</span>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-3.5 space-y-1.5 bg-stone-50/50 dark:bg-stone-800/40">
              <span className="font-bold text-stone-800 dark:text-stone-200 block uppercase tracking-wider text-[10px]">
                Server Pricing Breakdown
              </span>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Room Charges ({selectedBooking.nights} nights @ ₹{Number(selectedBooking.pricePerNight ?? 0).toLocaleString('en-IN')})</span>
                <span>₹{Number(selectedBooking.subtotal ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Hospitality GST & Taxes (12%)</span>
                <span>₹{Number(selectedBooking.taxes ?? 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-700">
                <span>Total Amount</span>
                <span className="text-emerald-700 dark:text-emerald-400">₹{Number(selectedBooking.totalPrice ?? 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {selectedBooking.status === 'CONFIRMED' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setCancelError('');
                    setCancelReason('');
                    setCancellingBooking(selectedBooking);
                    setSelectedBooking(null);
                  }}
                >
                  Cancel Booking
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancellingBooking && (
        <Modal
          isOpen={!!cancellingBooking}
          onClose={() => {
            if (!cancellingLoading) setCancellingBooking(null);
          }}
          title="Confirm Reservation Cancellation"
          subtitle={`Reference: ${cancellingBooking.bookingReference}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" /> Cancellation Policy Notice
              </span>
              <p>
                Are you sure you want to cancel your stay at{' '}
                <strong>{cancellingBooking.property?.name || cancellingBooking.hotelName || 'this property'}</strong> (
                {formatDate(cancellingBooking.checkInDate)} to {formatDate(cancellingBooking.checkOutDate)})?
              </p>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                Once cancelled, this room inventory is immediately released back to the property owner for re-booking by other guests.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Change of travel itinerary"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-xl text-xs bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancellingBooking(null)}
                disabled={cancellingLoading}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={cancellingLoading ? Loader2 : XCircle}
                onClick={handleConfirmCancel}
                disabled={cancellingLoading}
              >
                {cancellingLoading ? 'Cancelling...' : 'Yes, Cancel Reservation'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
