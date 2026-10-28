import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  CalendarCheck,
  IndianRupee,
  Plus,
  ArrowRight,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  Loader2,
  Users
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { propertiesAPI, roomsAPI, bookingsAPI, getMediaUrl } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';

export default function OwnerOverview() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [analytics, setAnalytics] = useState({
    propertiesCount: 0,
    roomsCount: 0,
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    recentBookings: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOwnerMetrics = async () => {
      setLoading(true);
      try {
        const [propRes, roomRes, analyticsRes] = await Promise.all([
          propertiesAPI.getMyProperties().catch(() => ({ data: { properties: [] } })),
          roomsAPI.getMyRooms().catch(() => ({ data: { rooms: [] } })),
          bookingsAPI.getOwnerAnalytics().catch(() => ({ data: { analytics: null } })),
        ]);

        if (propRes.data?.success) setProperties(propRes.data.properties || []);
        if (roomRes.data?.success) setRooms(roomRes.data.rooms || []);
        if (analyticsRes.data?.success && analyticsRes.data.analytics) {
          setAnalytics(analyticsRes.data.analytics);
        }
      } catch (err) {
        console.warn('Error fetching live owner metrics:', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOwnerMetrics();
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

  return (
    <DashboardLayout
      title={`Host Dashboard — ${user?.name || 'Property Owner'}`}
      subtitle="Multi-property management, room inventory status, and guest bookings."
      actions={
        <div className="flex items-center gap-2">
          <Link to="/dashboard/owner/properties">
            <Button variant="outline" size="sm" icon={Plus}>
              New Property
            </Button>
          </Link>
          <Link to="/dashboard/owner/rooms">
            <Button variant="primary" size="sm" icon={Plus}>
              Add Room
            </Button>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-stone-200">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider">Properties Listed</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : properties.length}
            </div>
            <p className="mt-1 text-xs text-stone-500">Verified database listings</p>
          </Card>

          <Card className="border-stone-200">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider">Total Rooms</span>
              <BedDouble className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : rooms.length}
            </div>
            <p className="mt-1 text-xs text-stone-500">Active room inventories</p>
          </Card>

          <Card className="border-stone-200">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-xs font-bold uppercase tracking-wider">Active Reservations</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : analytics.activeBookings}
            </div>
            <p className="mt-1 text-xs text-stone-500">Upcoming guest arrivals</p>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/40">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Property Revenue</span>
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-stone-900">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              ) : (
                `₹${(analytics.totalRevenue || 0).toLocaleString('en-IN')}`
              )}
            </div>
            <p className="mt-1 text-xs text-stone-500">Authorized owner earnings (Demo)</p>
          </Card>
        </div>

        {/* Isolation Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-soft flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-stone-600">
            <span className="font-bold text-stone-900 block mb-0.5">
              Strict Multi-Tenant Isolation Guarantee
            </span>
            As an authenticated Property Owner, your queries return data belonging strictly to your properties ({properties.map(h => h.name).join(', ') || 'your listings'}). Cross-tenant modifications or inspection of another owner's properties or rooms are strictly rejected at the API controller level.
          </div>
        </div>

        {/* Recent Guest Reservations */}
        {analytics.recentBookings && analytics.recentBookings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-900">Recent Guest Reservations</h3>
              <Link
                to="/dashboard/owner/bookings"
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View all bookings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <Card padding={false} className="border-stone-200 shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">Reference</th>
                      <th className="p-4">Guest</th>
                      <th className="p-4">Property & Room</th>
                      <th className="p-4">Dates</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {analytics.recentBookings.map((b) => (
                      <tr key={b._id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="p-4 font-mono font-bold text-stone-900">
                          {b.bookingReference}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-stone-900">{b.guest?.name || 'Guest'}</div>
                          <div className="text-stone-500 text-[11px]">{b.guest?.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-stone-900">{b.property?.name}</div>
                          <div className="text-stone-500 text-[11px]">{b.room?.roomType}</div>
                        </td>
                        <td className="p-4 text-stone-600">
                          {formatDate(b.checkInDate)} – {formatDate(b.checkOutDate)}
                          <div className="text-stone-400 text-[11px]">{b.nights} night(s)</div>
                        </td>
                        <td className="p-4 font-bold text-stone-900">
                          ₹{b.totalPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-right">
                          <Badge
                            variant={
                              b.status === 'CONFIRMED'
                                ? 'success'
                                : b.status === 'COMPLETED'
                                ? 'info'
                                : 'error'
                            }
                            size="sm"
                          >
                            {b.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Properties Summary */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-stone-900">Your Properties</h3>
            <Link
              to="/dashboard/owner/properties"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              Manage all properties <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-xs text-stone-500">Fetching properties from database...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-stone-200 text-center">
              <Building2 className="w-10 h-10 text-stone-300 mx-auto mb-2" />
              <h4 className="font-bold text-stone-800 text-sm">No properties listed yet</h4>
              <p className="text-xs text-stone-500 mt-1 mb-4">
                List your first hotel or resort to start managing rooms and receiving reservations.
              </p>
              <Link to="/dashboard/owner/properties">
                <Button variant="primary" size="sm">
                  Add Property
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {properties.map((hotel) => (
                <Card key={hotel._id || hotel.id} className="border-stone-200 shadow-soft">
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                      <img
                        src={getMediaUrl(hotel.coverImage)}
                        alt={hotel.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-stone-900 text-base">{hotel.name}</h4>
                        <Badge variant={hotel.status === 'ACTIVE' ? 'success' : 'default'} size="sm">
                          {hotel.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {hotel.location?.city || hotel.city}, {hotel.location?.state || hotel.state}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-xs text-stone-600">
                        <span>Rooms: {rooms.filter(r => (r.property?._id || r.property)?.toString() === (hotel._id || hotel.id)?.toString()).length} listed</span>
                        <span className="font-bold text-stone-900">
                          From ₹{hotel.startingPrice.toLocaleString('en-IN')}/night
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
