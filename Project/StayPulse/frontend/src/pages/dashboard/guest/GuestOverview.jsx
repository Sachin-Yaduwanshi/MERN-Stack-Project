import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Compass,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  MapPin,
  Building2,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { bookingsAPI } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';

export default function GuestOverview() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuestBookings = async () => {
      setLoading(true);
      try {
        const res = await bookingsAPI.getMyBookings();
        if (res.data?.success && res.data.bookings) {
          setBookings(res.data.bookings);
        }
      } catch (err) {
        console.error('Failed to load guest overview bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGuestBookings();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const upcomingBooking = bookings.find((b) => b.status === 'CONFIRMED');
  const pastBookings = bookings.filter((b) => b.status === 'COMPLETED');

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name || 'Guest'}`}
      subtitle="Track your upcoming reservations and manage personal travel details."
      actions={
        <Link to="/hotels">
          <Button variant="primary" size="sm" icon={Compass}>
            Explore Stays
          </Button>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Confirmed Upcoming Stays
            </span>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              ) : upcomingBooking ? (
                1
              ) : (
                0
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {upcomingBooking
                ? `Next: ${formatDate(upcomingBooking.checkInDate)}`
                : 'No active upcoming stays'}
            </p>
          </Card>

          <Card className="border-stone-200 bg-white">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Completed Stays
            </span>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
              ) : (
                pastBookings.length
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">Recorded in personal history</p>
          </Card>

          <Card className="border-stone-200 bg-white">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Privacy Status
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-emerald-700 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Isolated Tenant</span>
            </div>
            <p className="mt-1 text-xs text-stone-500">Protected against admin/cross-guest viewing</p>
          </Card>
        </div>

        {/* Next Upcoming Booking Card */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-500">Retrieving upcoming reservation details...</p>
          </div>
        ) : upcomingBooking ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-stone-900">Next Upcoming Stay</h3>
              <Link
                to="/dashboard/guest/bookings"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View all bookings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <Card className="border-stone-200 shadow-soft">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" size="sm" dot>
                      CONFIRMED
                    </Badge>
                    <span className="text-xs font-mono text-stone-400">
                      Ref: {upcomingBooking.bookingReference}
                    </span>
                  </div>

                  <h4 className="text-xl font-bold text-stone-900">
                    {upcomingBooking.property?.name || 'Property'}
                  </h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {upcomingBooking.property?.location?.city || upcomingBooking.property?.city || 'Location'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      {formatDate(upcomingBooking.checkInDate)} → {formatDate(upcomingBooking.checkOutDate)} ({upcomingBooking.nights} nights)
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      {upcomingBooking.room?.roomType || 'Room'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-stone-100">
                  <div className="text-right">
                    <span className="text-[11px] text-stone-400 block">Total Amount</span>
                    <span className="text-lg font-extrabold text-stone-900">
                      ₹{upcomingBooking.totalPrice.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Link to="/dashboard/guest/bookings">
                    <Button variant="outline" size="sm">
                      Manage Reservation
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-center">
            <Compass className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h4 className="font-bold text-stone-900 dark:text-stone-100">No active bookings found</h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 mb-4">
              Explore handpicked hotels in Jaipur, Goa, Manali, and Udaipur.
            </p>
            <Link to="/hotels">
              <Button variant="primary" size="sm">
                Continue Browsing
              </Button>
            </Link>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
