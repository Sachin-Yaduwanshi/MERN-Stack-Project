import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Building2,
  Calendar,
  Users,
  Wifi,
  Sparkles,
  ArrowRight,
  Filter,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { propertiesAPI, getMediaUrl } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

export default function HotelListingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLocation = searchParams.get('location') || '';

  const [locationQuery, setLocationQuery] = useState(initialLocation);
  const [selectedCity, setSelectedCity] = useState('');
  const [maxPrice, setMaxPrice] = useState(10000);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const allAmenities = [
    'Free WiFi',
    'Swimming Pool',
    'Beachfront Access',
    'Valet Parking',
    'Multi-Cuisine Dining',
    'Mountain View Balcony',
    'Air Conditioning',
    'Wood Fireplace'
  ];

  const cities = ['All Cities', 'Jaipur', 'Goa', 'Manali', 'Udaipur'];

  const toggleAmenity = (amenity) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]
    );
  };

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (locationQuery) params.search = locationQuery;
      if (selectedCity && selectedCity !== 'All Cities') params.city = selectedCity;
      if (maxPrice < 10000) params.maxPrice = maxPrice;
      if (selectedAmenities.length > 0) params.amenities = selectedAmenities.join(',');

      const res = await propertiesAPI.getAll(params);
      if (res.data?.success) {
        setHotels(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      setError('Could not connect to StayPulse property service. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties();
    }, 300);
    return () => clearTimeout(timer);
  }, [locationQuery, selectedCity, maxPrice, selectedAmenities]);

  const resetFilters = () => {
    setLocationQuery('');
    setSelectedCity('');
    setMaxPrice(10000);
    setSelectedAmenities([]);
    setSearchParams({});
  };

  return (
    <div className="flex-1 bg-stone-50 dark:bg-stone-950 py-8 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
              Explore Available Properties
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
              Showing {hotels.length} verified {hotels.length === 1 ? 'property' : 'properties'} ready for direct guest reservation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-white dark:bg-stone-800 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-semibold text-stone-700 dark:text-stone-200 shadow-xs"
            >
              <Filter className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Filters ({selectedAmenities.length + (selectedCity ? 1 : 0)})</span>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Filters Sidebar */}
          <div
            className={`${
              mobileFilterOpen ? 'block' : 'hidden'
            } md:block bg-white dark:bg-stone-900 p-6 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-soft space-y-6 md:sticky md:top-24`}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <span className="font-bold text-stone-900 dark:text-stone-100 text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Filter Stays
              </span>
              {(locationQuery || selectedCity || selectedAmenities.length > 0 || maxPrice < 10000) && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold"
                >
                  Reset all
                </button>
              )}
            </div>

            {/* City Selector */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                City / Region
              </label>
              <div className="flex flex-wrap gap-1.5">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city === 'All Cities' ? '' : city)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      (city === 'All Cities' && !selectedCity) || selectedCity === city
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">
                  Max Nightly Price
                </label>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{maxPrice.toLocaleString('en-IN')}
                </span>
              </div>
              <input
                type="range"
                min="2000"
                max="10000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                <span>₹2,000</span>
                <span>₹10,000+</span>
              </div>
            </div>

            {/* Amenities Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-2">
                Amenities
              </label>
              <div className="space-y-2">
                {allAmenities.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Hotel Listings List */}
          <div className="md:col-span-3 space-y-6">
            {/* Search query input */}
            <div className="relative bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-2 shadow-xs flex items-center">
              <Search className="w-5 h-5 text-stone-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Search by hotel name, city (e.g. Jaipur, Goa), or state..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none placeholder:text-stone-400"
              />
              {locationQuery && (
                <button
                  onClick={() => setLocationQuery('')}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 mr-2"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Connection Notice:</span>
                  <p className="mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {loading ? (
              <div className="bg-white dark:bg-stone-900 rounded-2xl p-16 text-center border border-stone-200 dark:border-stone-800">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Loading verified properties from database...</p>
              </div>
            ) : hotels.length === 0 ? (
              <div className="bg-white dark:bg-stone-900 rounded-2xl p-12 text-center border border-stone-200 dark:border-stone-800">
                <Building2 className="w-12 h-12 text-stone-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">No properties matched</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria, price range, or clearing filters.
                </p>
                <Button variant="outline" size="sm" onClick={resetFilters} className="mt-4 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 border border-stone-300 dark:border-stone-600 font-semibold shadow-xs">
                  Reset Search Filters & Continue Browsing
                </Button>
              </div>
            ) : (
              hotels.map((hotel) => (
                <div
                  key={hotel._id || hotel.id}
                  className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-soft hover:shadow-card transition-all duration-200 flex flex-col sm:flex-row group"
                >
                  {/* Hotel Cover Image */}
                  <div className="sm:w-72 md:w-80 h-56 sm:h-auto shrink-0 relative bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <img
                      src={getMediaUrl(hotel.coverImage)}
                      alt={hotel.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge variant="brand" size="sm">
                        Verified Host
                      </Badge>
                    </div>
                  </div>

                  {/* Hotel Info */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium mb-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>
                          {hotel.location?.address || hotel.address}, {hotel.location?.city || hotel.city}, {hotel.location?.state || hotel.state}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {hotel.name}
                      </h3>

                      <p className="text-xs text-stone-600 dark:text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                        {hotel.description}
                      </p>

                      {/* Amenities pills */}
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {hotel.amenities?.slice(0, 4).map((a, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-md"
                          >
                            {a}
                          </span>
                        ))}
                        {hotel.amenities?.length > 4 && (
                          <span className="text-[11px] font-medium text-stone-400 dark:text-stone-500 self-center">
                            +{hotel.amenities.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-semibold">
                          From
                        </span>
                        <div className="text-xl font-extrabold text-stone-900 dark:text-stone-100">
                          ₹{hotel.startingPrice.toLocaleString('en-IN')}{' '}
                          <span className="text-xs font-normal text-stone-500 dark:text-stone-400">/ night</span>
                        </div>
                      </div>

                      <Link to={`/hotels/${hotel._id || hotel.id}`}>
                        <Button variant="primary" size="md" icon={ArrowRight}>
                          View Rooms & Book
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
