import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Building2,
  ShieldCheck,
  Sparkles,
  Wifi,
  Coffee,
  Waves,
  Car,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { propertiesAPI, getMediaUrl } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

export default function HomePage() {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('1');
  const [featuredHotels, setFeaturedHotels] = useState([]);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const res = await propertiesAPI.getAll({ limit: 3 });
        if (res.data?.success && res.data.data?.length > 0) {
          setFeaturedHotels(res.data.data);
        }
      } catch (err) {
        console.warn('Could not load live featured properties:', err.message);
      }
    };
    loadFeatured();
  }, []);

  const displayHotels = featuredHotels.length > 0 ? featuredHotels : [
    {
      _id: 'demo-1',
      name: 'The Grand Heritage Palace',
      location: { city: 'Jaipur', state: 'Rajasthan' },
      description: 'Experience royal Rajasthani hospitality with courtyard dining, marble archways, and heritage suites.',
      coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      startingPrice: 4200,
      amenities: ['Free WiFi', 'Breakfast', 'Swimming Pool', 'Valet Parking'],
    },
    {
      _id: 'demo-2',
      name: 'Azure Palms Beach Resort',
      location: { city: 'Goa', state: 'Goa' },
      description: 'Direct beach access with panoramic Arabian Sea views, serene private cabanas, and sunlit rooms.',
      coverImage: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
      startingPrice: 3800,
      amenities: ['Beachfront', 'Infinity Pool', 'Seafood Dining', 'Cocktail Bar'],
    },
    {
      _id: 'demo-3',
      name: 'Silver Pine Valley Resort',
      location: { city: 'Manali', state: 'Himachal Pradesh' },
      description: 'Pine-fringed mountain sanctuary featuring wood-crafted chalets, warm fireplaces, and trekking guides.',
      coverImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
      startingPrice: 3100,
      amenities: ['Mountain View', 'Fireplace', 'Heated Rooms', 'Guided Treks'],
    }
  ];

  const popularDestinations = [
    { name: 'Jaipur', count: '12 Properties', image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=500&q=80' },
    { name: 'Goa', count: '18 Properties', image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=500&q=80' },
    { name: 'Manali', count: '9 Properties', image: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=500&q=80' },
    { name: 'Udaipur', count: '14 Properties', image: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=500&q=80' },
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (searchLocation) query.append('location', searchLocation);
    if (checkIn) query.append('checkIn', checkIn);
    if (checkOut) query.append('checkOut', checkOut);
    if (guests) query.append('guests', guests);
    navigate(`/hotels?${query.toString()}`);
  };

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-emerald-50/60 via-stone-50 to-stone-50 dark:from-emerald-950/20 dark:via-stone-950 dark:to-stone-950 pt-10 pb-16 lg:pt-14 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <Badge variant="brand" size="md" dot className="mb-4">
              Smart Multi-Property SaaS Platform
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight leading-[1.15]">
              Seamless Hotel Stays,{' '}
              <span className="text-emerald-600 dark:text-emerald-400 underline decoration-emerald-300 dark:decoration-emerald-600 decoration-wavy decoration-2">
                Effortless
              </span>{' '}
              Management.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-stone-600 dark:text-stone-400 leading-relaxed">
              Book verified rooms directly with property owners. StayPulse guarantees server-verified pricing, strict tenant privacy, and zero double-booking conflicts.
            </p>
          </div>

          {/* Search Bar Widget */}
          <div className="max-w-5xl mx-auto bg-white dark:bg-stone-900 rounded-3xl shadow-card border border-stone-200/90 dark:border-stone-800 p-4 sm:p-5">
            <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 items-center">
              {/* Location Input */}
              <div className="relative p-2.5 rounded-2xl hover:bg-stone-50/80 dark:hover:bg-stone-800/80 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700">
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Destination / City
                </label>
                <input
                  type="text"
                  placeholder="Where are you going?"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full text-sm font-medium text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none placeholder:text-stone-400"
                />
              </div>

              {/* Check-in & Check-out */}
              <div className="relative p-2.5 rounded-2xl hover:bg-stone-50/80 dark:hover:bg-stone-800/80 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Check In
                  </label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full text-xs font-medium text-stone-800 dark:text-stone-200 bg-transparent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Check Out
                  </label>
                  <input
                    type="date"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-xs font-medium text-stone-800 dark:text-stone-200 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* Guests Count */}
              <div className="relative p-2.5 rounded-2xl hover:bg-stone-50/80 dark:hover:bg-stone-800/80 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700">
                <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Guests & Capacity
                </label>
                <select
                  value={guests}
                  onChange={(e) => setGuests(e.target.value)}
                  className="w-full text-sm font-medium text-stone-800 dark:text-stone-200 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="1" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">1 Guest</option>
                  <option value="2" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">2 Guests</option>
                  <option value="3" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">3 Guests</option>
                  <option value="4" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">4 Guests</option>
                  <option value="5" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100">5+ Guests</option>
                </select>
              </div>

              {/* Search Action */}
              <div className="p-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={Search}
                  className="w-full h-13 rounded-2xl text-base font-semibold shadow-md shadow-emerald-600/25"
                >
                  Search Stays
                </Button>
              </div>
            </form>
          </div>

          {/* Quick value props */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Verified Direct Property Hosts
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Server-Enforced Availability Check
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Isolated Multi-Tenant Security
            </span>
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="py-14 bg-white dark:bg-stone-900/60 border-y border-stone-200/80 dark:border-stone-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Top Locations</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-1">
                Popular Destinations
              </h2>
            </div>
            <Link to="/hotels" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1">
              View all locations <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {popularDestinations.map((dest) => (
              <Link
                key={dest.name}
                to={`/hotels?location=${dest.name}`}
                className="group relative rounded-2xl overflow-hidden shadow-soft aspect-[4/5] block"
              >
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-lg font-bold group-hover:text-emerald-300 transition-colors">
                    {dest.name}
                  </h3>
                  <p className="text-xs text-stone-300 font-medium">{dest.count}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-16 bg-stone-50 dark:bg-stone-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Curated Stays</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mt-1">
                Featured Properties
              </h2>
            </div>
            <Link to="/hotels" className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1">
              Explore all hotels <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {displayHotels.map((hotel) => (
              <div
                key={hotel._id || hotel.id}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/90 dark:border-stone-800 overflow-hidden shadow-soft hover:shadow-card transition-all duration-200 flex flex-col group"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <img
                    src={getMediaUrl(hotel.coverImage)}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="brand" size="sm">
                      Verified Stay
                    </Badge>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium mb-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {hotel.location?.city || hotel.city}, {hotel.location?.state || hotel.state}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {hotel.name}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2 mt-2 leading-relaxed">
                    {hotel.description}
                  </p>

                  {/* Amenities */}
                  <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-1.5">
                    {hotel.amenities?.map((amenity, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-md"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto pt-5 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">Starting from</span>
                      <div className="text-lg font-extrabold text-stone-900 dark:text-stone-100">
                        ₹{hotel.startingPrice.toLocaleString('en-IN')}{' '}
                        <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ night</span>
                      </div>
                    </div>
                    <Link to={`/hotels/${hotel._id || hotel.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Role Isolation Section (Highlights the project architecture) */}
      <section id="roles" className="py-16 bg-white dark:bg-stone-900/60 border-t border-stone-200 dark:border-stone-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge variant="brand" size="md">
              Role-Based Architecture
            </Badge>
            <h2 className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight mt-3">
              Engineered with 3 Strict Roles
            </h2>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-2">
              Every route, query, and dashboard operation is protected by backend JWT authorization and strict data boundaries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Guest */}
            <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-sand-50/50 dark:bg-stone-900">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">1. Guest Portal</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 mb-4">
                Designed for travellers looking for authentic stays with transparent pricing.
              </p>
              <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300 flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Search hotels by destination and dates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  View real-time room capacity & pricing breakdown
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Private booking history & cancellation workflow
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Optional profile photo with strict privacy
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800">
                <Link to="/register">
                  <Button variant="outline" size="sm" className="w-full">
                    Register as Guest
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Property Owner */}
            <Card className="flex flex-col border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-400/20 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-soft">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">2. Property Owner</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 mb-4">
                Complete multi-property SaaS management suite for independent hoteliers.
              </p>
              <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300 flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Add hotels, amenities, and room inventories
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Camera & device gallery photo upload with preview
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Manage reservations exclusive to their properties
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  Zero cross-owner data leakage guaranteed
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                <Link to="/register">
                  <Button variant="primary" size="sm" className="w-full">
                    List Your Property
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Platform Admin */}
            <Card className="flex flex-col border-stone-200 dark:border-stone-800 bg-sand-50/50 dark:bg-stone-900">
              <div className="w-12 h-12 rounded-xl bg-stone-800 dark:bg-stone-700 text-stone-100 flex items-center justify-center font-bold mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">3. Platform Admin</h3>
              <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 mb-4">
                System operations, property moderation, and platform metrics.
              </p>
              <ul className="space-y-2 text-xs text-stone-700 dark:text-stone-300 flex-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-stone-700 dark:text-stone-400 shrink-0" />
                  Monitor aggregate system statistics & user totals
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-stone-700 dark:text-stone-400 shrink-0" />
                  Moderate public hotel listings (Active / Inactive)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Strict Privacy:</span> No access to guest private bookings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
                  Guest photos hidden from admin API responses
                </li>
              </ul>
              <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800">
                <Link to="/login">
                  <Button variant="secondary" size="sm" className="w-full">
                    Admin Portal Sign In
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-stone-900 dark:bg-stone-950 text-white border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Ready to Experience Modern Hospitality?
          </h2>
          <p className="mt-3 text-stone-300 dark:text-stone-400 text-sm sm:text-base leading-relaxed">
            Whether booking your next vacation or scaling your hotel operations, StayPulse provides the speed, reliability, and security your stays deserve.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" size="lg">
                Create Free Account
              </Button>
            </Link>
            <Link to="/hotels">
              <Button
                variant="secondary"
                size="lg"
                className="bg-stone-800 hover:bg-stone-700 text-white border-2 border-stone-600 hover:border-stone-400 font-bold shadow-md focus:ring-2 focus:ring-emerald-400 focus:outline-none"
              >
                Continue Browsing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
