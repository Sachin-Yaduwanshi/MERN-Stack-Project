import React, { useState, useEffect, useRef } from 'react';
import {
  BedDouble,
  Plus,
  Users,
  Edit,
  Trash2,
  Camera,
  Upload,
  Building2,
  CheckCircle2,
  Wrench,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { roomsAPI, propertiesAPI, uploadAPI, getMediaUrl } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import CameraCaptureModal from '../../../components/ui/CameraCaptureModal';

export default function OwnerRooms() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Form State
  const [hotelId, setHotelId] = useState('');
  const [roomType, setRoomType] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [bedType, setBedType] = useState('1 King Bed');
  const [pricePerNight, setPricePerNight] = useState(4000);
  const [status, setStatus] = useState('AVAILABLE');
  const [roomImage, setRoomImage] = useState('');
  const [amenitiesInput, setAmenitiesInput] = useState('King Bed, AC, Free WiFi, Smart TV');

  const fileInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [propRes, roomRes] = await Promise.all([
        propertiesAPI.getMyProperties(),
        roomsAPI.getMyRooms(),
      ]);

      if (propRes.data?.success) {
        setProperties(propRes.data.properties || []);
        if (propRes.data.properties?.length > 0 && !hotelId) {
          setHotelId(propRes.data.properties[0]._id || propRes.data.properties[0].id);
        }
      }

      if (roomRes.data?.success) {
        setRooms(roomRes.data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load room inventory:', err);
      setError(err.response?.data?.message || 'Failed to load rooms from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRooms = rooms.filter((r) => {
    if (selectedPropertyId === 'ALL') return true;
    const propId = r.property?._id || r.property || r.hotelId;
    return propId?.toString() === selectedPropertyId;
  });

  const handleOpenCreate = () => {
    setEditingRoom(null);
    if (properties.length > 0) {
      setHotelId(properties[0]._id || properties[0].id);
    }
    setRoomType('');
    setDescription('');
    setCapacity(2);
    setBedType('1 King Bed');
    setPricePerNight(4000);
    setStatus('AVAILABLE');
    setRoomImage('https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80');
    setAmenitiesInput('King Bed, AC, Free WiFi, Smart TV');
    setModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setHotelId(room.property?._id || room.property || room.hotelId);
    setRoomType(room.roomType);
    setDescription(room.description || '');
    setCapacity(room.capacity);
    setBedType(room.bedType);
    setPricePerNight(room.pricePerNight);
    setStatus(room.status);
    setRoomImage(room.images?.[0] || '');
    setAmenitiesInput(room.amenities?.join(', ') || '');
    setModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file.');
        return;
      }
      try {
        const res = await uploadAPI.uploadFile(file, 'rooms');
        if (res.data?.success && res.data.url) {
          setRoomImage(res.data.url);
        }
      } catch (err) {
        const reader = new FileReader();
        reader.onload = () => setRoomImage(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCameraCapture = async (dataUrl) => {
    try {
      const res = await uploadAPI.uploadBase64(dataUrl, 'rooms');
      if (res.data?.success && res.data.url) {
        setRoomImage(res.data.url);
      } else {
        setRoomImage(dataUrl);
      }
    } catch (err) {
      setRoomImage(dataUrl);
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');

    const amenities = amenitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = {
      roomType,
      description,
      capacity: Number(capacity),
      bedType,
      pricePerNight: Number(pricePerNight),
      amenities,
      images: [roomImage],
      status,
    };

    try {
      if (editingRoom) {
        const res = await roomsAPI.update(editingRoom._id || editingRoom.id, payload);
        if (res.data?.success) {
          setSuccessMsg(`Room "${roomType}" updated successfully.`);
        }
      } else {
        const res = await roomsAPI.create(hotelId, payload);
        if (res.data?.success) {
          setSuccessMsg(`Room "${roomType}" added to property.`);
        }
      }
      setModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to save room:', err);
      setError(err.response?.data?.message || 'Error occurred while saving room.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    if (!window.confirm(`Are you sure you want to delete or deactivate "${roomName}"?`)) {
      return;
    }
    try {
      const res = await roomsAPI.delete(roomId);
      if (res.data?.success) {
        setSuccessMsg(res.data.message || 'Room removed.');
        await fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete room.');
    }
  };

  return (
    <DashboardLayout
      title="Rooms Inventory"
      subtitle="Manage pricing, capacity rules, and availability states for each room."
      actions={
        <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate} disabled={properties.length === 0}>
          Add Room
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Success and Error Alerts */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Property Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-stone-500 mr-2">Filter by Hotel:</span>
          <button
            onClick={() => setSelectedPropertyId('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedPropertyId === 'ALL'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            All Properties ({rooms.length})
          </button>
          {properties.map((h) => (
            <button
              key={h._id || h.id}
              onClick={() => setSelectedPropertyId((h._id || h.id).toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedPropertyId === (h._id || h.id).toString()
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200'
              }`}
            >
              {h.name}
            </button>
          ))}
        </div>

        {/* Rooms Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-stone-200">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-stone-700">Loading room inventory from database...</p>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center">
            <BedDouble className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h4 className="text-base font-bold text-stone-900">No rooms listed in this category</h4>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Add rooms with capacity rules and rates to enable guest bookings.
            </p>
            <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenCreate} disabled={properties.length === 0}>
              Add Room
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <Card key={room._id || room.id} className="border-stone-200 shadow-soft flex flex-col justify-between">
                <div>
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-stone-100 mb-3">
                    <img
                      src={getMediaUrl(room.images?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80')}
                      alt={room.roomType}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <Badge
                        variant={room.status === 'AVAILABLE' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {room.status}
                      </Badge>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold text-emerald-700 block mb-0.5">
                    {room.property?.name || 'Your Property'}
                  </span>
                  <h3 className="text-base font-bold text-stone-900">{room.roomType}</h3>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-2">{room.description}</p>

                  <div className="mt-3 flex items-center gap-3 text-xs text-stone-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-emerald-600" /> Max {room.capacity}
                    </span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-emerald-600" /> {room.bedType}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {room.amenities?.map((a, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium bg-stone-100 text-stone-600 px-2 py-0.5 rounded"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-stone-400 block uppercase">Nightly Rate</span>
                    <span className="text-base font-extrabold text-stone-900">
                      ₹{room.pricePerNight.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit}
                      onClick={() => handleOpenEdit(room)}
                    >
                      Edit
                    </Button>
                    <button
                      onClick={() => handleDeleteRoom(room._id || room.id, room.roomType)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete / Deactivate Room"
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

      {/* Add / Edit Room Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingRoom ? "Edit Room Inventory" : "Add Room to Property"}
          subtitle="Configure pricing, bed types, and guest capacity limits in MongoDB."
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Target Property
              </label>
              <select
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                required
                disabled={!!editingRoom}
              >
                {properties.map((h) => (
                  <option key={h._id || h.id} value={h._id || h.id}>
                    {h.name} ({h.location?.city || h.city})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Room Type / Name"
              type="text"
              placeholder="e.g. Deluxe Heritage Suite"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Room Description
              </label>
              <textarea
                rows={2}
                className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                placeholder="Comfort and architectural details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Max Guest Capacity"
                type="number"
                min="1"
                max="20"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
              <Input
                label="Bed Type"
                type="text"
                placeholder="e.g. 1 King Bed"
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Price Per Night (₹)"
                type="number"
                min="1"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                required
              />
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                  Availability Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </select>
              </div>
            </div>

            <Input
              label="Amenities (Comma Separated)"
              type="text"
              placeholder="King Bed, AC, Free WiFi, Balcony"
              value={amenitiesInput}
              onChange={(e) => setAmenitiesInput(e.target.value)}
            />

            {/* Room Photo with Camera Capture Option */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Room Photo
              </label>
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                  {roomImage ? (
                    <img src={getMediaUrl(roomImage)} alt="Room preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">
                      No Photo
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
                {editingRoom ? "Save Room" : "Create Room"}
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
        title="Capture Room Photo"
      />
    </DashboardLayout>
  );
}
