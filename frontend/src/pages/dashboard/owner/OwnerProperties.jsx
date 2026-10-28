import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Plus,
  MapPin,
  Edit,
  Trash2,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Loader2,
  Clock,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { propertiesAPI, uploadAPI, getMediaUrl } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import CameraCaptureModal from '../../../components/ui/CameraCaptureModal';

export default function OwnerProperties() {
  const { user } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [startingPrice, setStartingPrice] = useState(3500);
  const [coverImage, setCoverImage] = useState('');
  const [amenitiesInput, setAmenitiesInput] = useState('Free WiFi, Swimming Pool, Valet Parking');
  const [status, setStatus] = useState('PENDING_APPROVAL');

  const fileInputRef = useRef(null);

  const fetchMyProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertiesAPI.getMyProperties();
      if (res.data?.success) {
        setHotels(res.data.properties || []);
      }
    } catch (err) {
      console.error('Failed to load owner properties:', err);
      setError(err.response?.data?.message || 'Failed to fetch properties from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProperties();
  }, []);

  const handleOpenCreate = () => {
    setEditingHotel(null);
    setName('');
    setTagline('');
    setDescription('');
    setCity('');
    setState('');
    setAddress('');
    setStartingPrice(3500);
    setCoverImage('https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80');
    setAmenitiesInput('Free WiFi, Swimming Pool, Valet Parking');
    setStatus('PENDING_APPROVAL');
    setModalOpen(true);
  };

  const handleOpenEdit = (hotel) => {
    setEditingHotel(hotel);
    setName(hotel.name);
    setTagline(hotel.tagline || '');
    setDescription(hotel.description);
    setCity(hotel.location?.city || hotel.city || '');
    setState(hotel.location?.state || hotel.state || '');
    setAddress(hotel.location?.address || hotel.address || '');
    setStartingPrice(hotel.startingPrice);
    setCoverImage(hotel.coverImage);
    setAmenitiesInput(hotel.amenities?.join(', ') || '');
    setStatus(hotel.status || 'PENDING_APPROVAL');
    setModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (JPEG, PNG, WEBP).');
        return;
      }
      try {
        const res = await uploadAPI.uploadFile(file, 'properties');
        if (res.data?.success && res.data.url) {
          setCoverImage(res.data.url);
        }
      } catch (err) {
        const reader = new FileReader();
        reader.onload = () => setCoverImage(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCameraCapture = async (dataUrl) => {
    try {
      const res = await uploadAPI.uploadBase64(dataUrl, 'properties');
      if (res.data?.success && res.data.url) {
        setCoverImage(res.data.url);
      } else {
        setCoverImage(dataUrl);
      }
    } catch (err) {
      setCoverImage(dataUrl);
    }
  };

  const handleSaveHotel = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    const amenities = amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      name,
      tagline,
      description,
      location: {
        address,
        city,
        state,
      },
      startingPrice: Number(startingPrice),
      coverImage,
      amenities,
    };

    // Only include status if toggling between ACTIVE and INACTIVE for an already approved property
    if (editingHotel && ['ACTIVE', 'INACTIVE'].includes(editingHotel.status)) {
      payload.status = status;
    }

    try {
      if (editingHotel) {
        const res = await propertiesAPI.update(editingHotel._id || editingHotel.id, payload);
        if (res.data?.success) {
          setSuccessMsg(
            editingHotel.status === 'REJECTED'
              ? `Property "${name}" updated and resubmitted for admin approval.`
              : `Property "${name}" updated successfully.`
          );
        }
      } else {
        const res = await propertiesAPI.create(payload);
        if (res.data?.success) {
          setSuccessMsg(
            `Property "${name}" submitted for approval! It will appear publicly once approved by Platform Administration.`
          );
        }
      }
      setModalOpen(false);
      await fetchMyProperties();
    } catch (err) {
      console.error('Failed to save property:', err);
      setError(err.response?.data?.message || 'Error occurred while saving property.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  const handleDeleteProperty = async (hotelId, hotelName) => {
    if (!window.confirm(`Are you sure you want to delete "${hotelName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await propertiesAPI.delete(hotelId);
      if (res.data?.success) {
        setSuccessMsg(`Property "${hotelName}" deleted.`);
        await fetchMyProperties();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete property.');
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'ACTIVE':
        return <Badge variant="success" size="sm">LIVE / ACTIVE</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning" size="sm">PENDING REVIEW</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">REJECTED</Badge>;
      case 'INACTIVE':
      default:
        return <Badge variant="secondary" size="sm">PAUSED / INACTIVE</Badge>;
    }
  };

  return (
    <DashboardLayout
      title="My Properties"
      subtitle="Create and manage your hotel listings, imagery, room inventory, and starting rates."
      actions={
        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate}>
          List New Property
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Feedback alerts */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-stone-200">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-stone-700">Loading your properties from MongoDB...</p>
          </div>
        ) : hotels.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center">
            <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h4 className="text-base font-bold text-stone-900">No properties listed yet</h4>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Click below to list your first hotel. All new submissions are reviewed by Platform Administration.
            </p>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate}>
              List New Property
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotels.map((hotel) => (
              <Card key={hotel._id || hotel.id} className="border-stone-200 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 mb-4">
                    <img
                      src={getMediaUrl(hotel.coverImage)}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      {getStatusBadge(hotel.status)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {hotel.location?.city || hotel.city}, {hotel.location?.state || hotel.state}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-stone-900">{hotel.name}</h3>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-2">{hotel.description}</p>

                  {/* Rejection / Pending notices on Card */}
                  {hotel.status === 'REJECTED' && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Application Rejected by Admin</span>
                      </div>
                      <p className="text-rose-700">
                        {hotel.rejectionReason || 'Listing did not meet platform guidelines.'}
                      </p>
                      <p className="mt-1 text-[11px] text-rose-600">
                        Click "Edit" to update details and resubmit for approval.
                      </p>
                    </div>
                  )}

                  {hotel.status === 'PENDING_APPROVAL' && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Awaiting Administrator Review</span>
                        <span className="text-[11px] text-amber-700">
                          Listing is hidden from public search until reviewed and approved.
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1">
                    {hotel.amenities?.map((a, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-400 block">Starting From</span>
                    <span className="text-base font-extrabold text-stone-900">
                      ₹{hotel.startingPrice.toLocaleString('en-IN')}/night
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => handleOpenEdit(hotel)}
                    >
                      {hotel.status === 'REJECTED' ? 'Edit & Resubmit' : 'Edit'}
                    </Button>
                    <button
                      onClick={() => handleDeleteProperty(hotel._id || hotel.id, hotel.name)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Property"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Hotel Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingHotel ? `Edit Property: ${editingHotel.name}` : "Submit New Property Listing"}
          subtitle="All submissions undergo administrative review before becoming publicly visible."
          maxWidth="max-w-xl"
        >
          <form onSubmit={handleSaveHotel} className="space-y-4">
            {/* Status Information Banner */}
            {!editingHotel ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Mandatory Quality Review</span>
                  <span className="text-[11px] text-amber-800">
                    Your property will be created in <strong>PENDING_APPROVAL</strong> state. It will become bookable once approved by the Platform Administrator.
                  </span>
                </div>
              </div>
            ) : editingHotel.status === 'REJECTED' ? (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                <span className="font-bold block text-rose-950">Previous Rejection Feedback:</span>
                <p className="mt-1 text-rose-800">{editingHotel.rejectionReason}</p>
                <p className="mt-1.5 text-[11px] text-rose-700 font-medium">
                  Saving updates will automatically resubmit this property for administrator review.
                </p>
              </div>
            ) : editingHotel.status === 'PENDING_APPROVAL' ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>This property application is currently in the admin approval queue.</span>
              </div>
            ) : null}

            <Input
              label="Property Name"
              type="text"
              placeholder="e.g. Royal Heritage Resort"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Tagline / Short Hook"
              type="text"
              placeholder="e.g. Panoramic views of Lake Pichola"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Detailed Description
              </label>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-stone-200 bg-white p-3 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                placeholder="Detailed property highlights..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City"
                type="text"
                placeholder="e.g. Jaipur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
              <Input
                label="State"
                type="text"
                placeholder="e.g. Rajasthan"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
              />
            </div>

            <Input
              label="Street Address"
              type="text"
              placeholder="e.g. 14 Palace Road, Civil Lines"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />

            <div className={`grid ${editingHotel && ['ACTIVE', 'INACTIVE'].includes(editingHotel.status) ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              <Input
                label="Starting Nightly Rate (₹)"
                type="number"
                placeholder="3500"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                required
              />

              {/* Only show status toggle if property has already been approved */}
              {editingHotel && ['ACTIVE', 'INACTIVE'].includes(editingHotel.status) && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                    Listing Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="ACTIVE">ACTIVE (Visible & Bookable)</option>
                    <option value="INACTIVE">INACTIVE (Temporarily Paused)</option>
                  </select>
                </div>
              )}
            </div>

            <Input
              label="Amenities (Comma Separated)"
              type="text"
              placeholder="Free WiFi, Swimming Pool, Valet Parking"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
            />

            {/* Photo Section with Camera Capture Option */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Property Cover Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                  {coverImage ? (
                    <img src={getMediaUrl(coverImage)} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                      No Image
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Upload}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Camera}
                    onClick={() => setCameraModalOpen(true)}
                  >
                    Use Camera
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={actionLoading}>
                {editingHotel
                  ? editingHotel.status === 'REJECTED'
                    ? "Save & Resubmit for Review"
                    : "Save Changes"
                  : "Submit Property for Approval"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        title="Capture Property Photo"
      />
    </DashboardLayout>
  );
}
