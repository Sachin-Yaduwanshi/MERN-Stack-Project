import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  BedDouble,
  Sparkles,
  ArrowLeft,
  Info,
  Clock,
  Building2,
  CreditCard,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { propertiesAPI, roomsAPI, bookingsAPI, getMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';

export default function HotelDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [hotelRooms, setHotelRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const getThreeDaysLaterStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  };

  const [activeImage, setActiveImage] = useState('');
  const [checkIn, setCheckIn] = useState(getTomorrowStr());
  const [checkOut, setCheckOut] = useState(getThreeDaysLaterStr());
  const [guestCount, setGuestCount] = useState(2);

  // Booking Modal State (Connected to real backend API)
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const fetchHotelAndRooms = async () => {
      setLoading(true);
      setError('');
      try {
        const [propRes, roomRes] = await Promise.all([
          propertiesAPI.getById(id),
          roomsAPI.getByProperty(id),
        ]);

        if (propRes.data?.success && propRes.data.property) {
          const prop = propRes.data.property;
          setHotel(prop);
          setActiveImage(prop.coverImage);
        }

        if (roomRes.data?.success && roomRes.data.rooms) {
          setHotelRooms(roomRes.data.rooms);
        }
      } catch (err) {
        console.error('Failed to load hotel details:', err);
        setError('Failed to load property details from backend API.');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelAndRooms();
  }, [id]);

  // Calculate nights
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }, [checkIn, checkOut]);

  // Price calculations
  const calculatePricing = (room) => {
    if (!room) return { subtotal: 0, taxes: 0, total: 0 };
    const subtotal = room.pricePerNight * nights;
    const taxes = Math.round(subtotal * 0.12); // 12% GST
    const total = subtotal + taxes;
    return { subtotal, taxes, total };
  };

  const handleOpenBooking = (room) => {
    setSelectedRoom(room);
    setBookingConfirmed(false);
    setConfirmedBooking(null);
    setBookingError('');
  };

  const handleConfirmReservation = async () => {
    if (!user) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (user.role !== 'GUEST') {
      setBookingError(
        `Only GUEST accounts can confirm room bookings. You are currently logged in as a ${user.role.replace('_', ' ')}.`
      );
      return;
    }

    setSubmittingBooking(true);
    setBookingError('');

    try {
      const roomId = selectedRoom._id || selectedRoom.id;
      const res = await bookingsAPI.create({
        roomId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guestsCount: guestCount,
      });

      if (res.data?.success && res.data.booking) {
        setConfirmedBooking(res.data.booking);
        setBookingRef(res.data.booking.bookingReference);
        setBookingConfirmed(true);
      } else {
        setBookingError(res.data?.message || 'Failed to place reservation.');
      }
    } catch (err) {
      console.error('Booking creation error:', err);
      const msg =
        err.response?.data?.message ||
        'Unable to complete reservation. Selected dates may conflict with existing bookings.';
      setBookingError(msg);
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedRoom(null);
    setBookingConfirmed(false);
    setConfirmedBooking(null);
    setBookingError('');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20 bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-stone-700">Loading hotel & room inventory from database...</p>
        </div>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-stone-900">Property Not Found</h2>
        <p className="text-xs text-stone-500 mt-1 mb-6">{error || 'The requested property listing does not exist.'}</p>
        <Link to="/hotels">
          <Button variant="primary" size="md">
            Return to Hotel Discovery
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-stone-50 dark:bg-stone-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/hotels"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hotel Listings
          </Link>
        </div>

        {/* Header Title & Location */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant="brand" size="sm">
              Verified Property
            </Badge>
            <span className="text-xs text-stone-400">•</span>
            <div className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400 font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>
                {hotel.location?.address || hotel.address}, {hotel.location?.city || hotel.city}, {hotel.location?.state || hotel.state}
              </span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
            {hotel.name}
          </h1>
          {hotel.tagline && <p className="text-base text-stone-600 dark:text-stone-300 mt-1 max-w-3xl">{hotel.tagline}</p>}
        </div>

        {/* Photo Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="md:col-span-2 rounded-2xl overflow-hidden aspect-[16/10] bg-stone-100 shadow-soft">
            <img
              src={getMediaUrl(activeImage || hotel.coverImage)}
              alt={hotel.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">
            {(hotel.images && hotel.images.length > 0 ? hotel.images : [hotel.coverImage]).map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveImage(img)}
                className={`relative rounded-xl overflow-hidden aspect-[16/10] bg-stone-100 shrink-0 md:shrink md:flex-1 border-2 transition-all ${
                  activeImage === img ? 'border-emerald-600 ring-2 ring-emerald-200' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img src={getMediaUrl(img)} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Description, Amenities, Meet Your Host */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-soft">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-3">About the Property</h2>
              <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">{hotel.description}</p>
            </div>

            {/* Property Amenities */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-soft">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Property Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hotel.amenities?.map((amenity, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-100 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Meet Your Host Section (Respects ownerAvatarVisible) */}
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 sm:p-8 border border-stone-200 dark:border-stone-800 shadow-soft">
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-4">Meet Your Host</h2>
              <div className="flex items-center gap-4">
                {hotel.owner?.avatar ? (
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-100 dark:bg-stone-800 border-2 border-emerald-500 shadow-sm shrink-0">
                    <img
                      src={getMediaUrl(hotel.owner.avatar)}
                      alt={hotel.owner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xl border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <Building2 className="w-8 h-8 text-emerald-700 dark:text-emerald-400" />
                  </div>
                )}
                <div>
                  <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">{hotel.owner?.name || 'Verified Host'}</h4>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Verified StayPulse Partner Host
                  </p>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-2">
                    Direct communication with the property owner is enabled upon confirmed booking.
                  </p>
                </div>
              </div>
            </div>

            {/* Available Rooms Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Available Room Options</h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Showing rooms matching your party of {guestCount} {guestCount === 1 ? 'guest' : 'guests'}.
                  </p>
                </div>
              </div>

              {hotelRooms.length === 0 ? (
                <div className="bg-white dark:bg-stone-900 rounded-2xl p-8 text-center border border-stone-200 dark:border-stone-800">
                  <p className="text-sm text-stone-500 dark:text-stone-400">No rooms currently listed for this property.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {hotelRooms.map((room) => {
                    const pricing = calculatePricing(room);
                    const meetsCapacity = room.capacity >= guestCount;

                    return (
                      <div
                        key={room._id || room.id}
                        className={`bg-white dark:bg-stone-900 rounded-2xl border p-5 sm:p-6 shadow-soft transition-all flex flex-col md:flex-row gap-6 ${
                          meetsCapacity ? 'border-stone-200 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700' : 'border-stone-200 dark:border-stone-800 opacity-60'
                        }`}
                      >
                        {/* Room photo */}
                        <div className="md:w-56 h-44 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 shrink-0 relative">
                          <img
                            src={getMediaUrl(room.images?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80')}
                            alt={room.roomType}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2">
                            <Badge variant="brand" size="sm">
                              {room.bedType}
                            </Badge>
                          </div>
                        </div>

                        {/* Room Info */}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{room.roomType}</h3>
                              <Badge variant={room.status === 'AVAILABLE' ? 'success' : 'danger'} size="sm">
                                {room.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 leading-relaxed">
                              {room.description}
                            </p>

                            <div className="mt-3 flex items-center gap-4 text-xs text-stone-600 dark:text-stone-400 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Up to {room.capacity} Guests
                              </span>
                              <span className="flex items-center gap-1.5">
                                <BedDouble className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {room.bedType}
                              </span>
                            </div>

                            {/* Amenities */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {room.amenities?.map((a, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-0.5 rounded"
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Pricing & CTA */}
                          <div className="mt-5 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                            <div>
                              <div className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
                                ₹{room.pricePerNight.toLocaleString('en-IN')}{' '}
                                <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ night</span>
                              </div>
                              <span className="text-[11px] text-stone-400 dark:text-stone-500">
                                ₹{pricing.total.toLocaleString('en-IN')} total for {nights} {nights === 1 ? 'night' : 'nights'} (incl. GST)
                              </span>
                            </div>

                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!meetsCapacity || room.status !== 'AVAILABLE'}
                              onClick={() => handleOpenBooking(room)}
                            >
                              {!meetsCapacity ? 'Exceeds Room Capacity' : 'Select Room'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Date & Guest Selector */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-800 shadow-soft sticky top-24">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mb-4 pb-2 border-b border-stone-100 dark:border-stone-800">
                Reservation Parameters
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Check-In Date
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    min={getTodayStr()}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Check-Out Date
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn || getTodayStr()}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                    Guests Traveling
                  </label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 rounded-xl text-xs font-medium text-stone-800 dark:text-stone-200 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value={1} className="bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200">1 Guest</option>
                    <option value={2} className="bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200">2 Guests</option>
                    <option value={3} className="bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200">3 Guests</option>
                    <option value={4} className="bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200">4 Guests</option>
                    <option value={5} className="bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200">5 Guests</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-sand-100/70 dark:bg-stone-800/80 border border-sand-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-300 space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Duration:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Party Size:</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{guestCount} {guestCount === 1 ? 'Person' : 'People'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center leading-relaxed">
                  Select an available room on the left to review the price breakdown and confirm your stay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Summary Modal */}
      {selectedRoom && (
        <Modal
          isOpen={!!selectedRoom}
          onClose={handleCloseModal}
          title={bookingConfirmed ? "Booking Confirmed!" : "Review Reservation Details"}
          subtitle={bookingConfirmed ? `Reference: ${bookingRef}` : `${hotel.name} — ${selectedRoom.roomType}`}
          maxWidth="max-w-md"
        >
          {bookingConfirmed ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-lg font-bold text-stone-900 dark:text-stone-100">Reservation Confirmed in Database</h4>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                  Your official reservation reference is <span className="font-mono font-bold text-emerald-800 dark:text-emerald-400">{bookingRef}</span>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Property:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{hotel.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Room:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{selectedRoom.roomType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Dates:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{checkIn} to {checkOut} ({confirmedBooking?.nights || nights} nights)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Guests:</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100">{confirmedBooking?.guestsCount || guestCount} Guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Status:</span>
                  <Badge variant="success" size="sm">CONFIRMED</Badge>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 dark:border-stone-700">
                  <span className="font-bold text-stone-900 dark:text-stone-100">Total Reservation Amount:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">₹{(confirmedBooking?.totalPrice || calculatePricing(selectedRoom).total).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 text-left">
                <span className="font-bold block">Reservation Stored:</span>
                Your booking has been saved in MongoDB and can now be tracked and managed directly in your Guest Dashboard.
              </div>

              <div className="pt-2 flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseModal}
                  className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 font-semibold shadow-xs"
                >
                  Continue Browsing
                </Button>
                <Link to="/dashboard/guest/bookings">
                  <Button variant="primary" size="sm">
                    View My Bookings
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Error Alert if any */}
              {bookingError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Guest Authentication Prompt if not logged in */}
              {!user && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <span className="font-bold block mb-1">Account Required:</span>
                  You must be logged in as a Guest to place a booking.
                  <div className="mt-2">
                    <Link
                      to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                      className="font-bold text-amber-950 underline hover:text-emerald-800"
                    >
                      Click here to Log In or Register
                    </Link>
                  </div>
                </div>
              )}

              {/* Role Check Warning if logged in as Non-Guest */}
              {user && user.role !== 'GUEST' && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                  <span className="font-bold block mb-0.5">Role Restriction:</span>
                  You are signed in as <strong>{user.role}</strong>. Only <strong>GUEST</strong> accounts can book rooms. Please log into your guest account.
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Dates:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{checkIn} → {checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Stay Duration:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{nights} {nights === 1 ? 'Night' : 'Nights'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 dark:text-stone-400">Guests:</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{guestCount} of max {selectedRoom.capacity}</span>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                  Server Price Calculation
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>₹{selectedRoom.pricePerNight.toLocaleString('en-IN')} × {nights} nights</span>
                    <span>₹{calculatePricing(selectedRoom).subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Hospitality GST & Taxes (12%)</span>
                    <span>₹{calculatePricing(selectedRoom).taxes.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-stone-900 dark:text-stone-100 pt-2 border-t border-stone-200 dark:border-stone-700">
                    <span>Total Amount</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">₹{calculatePricing(selectedRoom).total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block">No Real Payment Collected:</span>
                This reservation uses server-side demo validation. Your booking will be confirmed without credit card collection.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
                <Button variant="outline" size="sm" onClick={handleCloseModal} disabled={submittingBooking}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  icon={submittingBooking ? Loader2 : CreditCard}
                  onClick={handleConfirmReservation}
                  disabled={submittingBooking || (user && user.role !== 'GUEST')}
                >
                  {submittingBooking ? 'Reserving...' : 'Confirm Reservation'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
