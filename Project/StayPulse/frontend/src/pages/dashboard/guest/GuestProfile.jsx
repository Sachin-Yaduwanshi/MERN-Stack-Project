import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  EyeOff,
  Camera
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { uploadAPI, getMediaUrl } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import CameraCaptureModal from '../../../components/ui/CameraCaptureModal';

export default function GuestProfile() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98765 43210');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file (JPEG/PNG/WEBP).');
        return;
      }
      try {
        const res = await uploadAPI.uploadFile(file, 'profiles');
        if (res.data?.success && res.data.url) {
          setAvatar(res.data.url);
        }
      } catch (err) {
        const reader = new FileReader();
        reader.onload = () => setAvatar(reader.result);
        reader.readAsDataURL(file);
      }
    }
  };

  const handleCameraCapture = async (dataUrl) => {
    try {
      const res = await uploadAPI.uploadBase64(dataUrl, 'profiles');
      if (res.data?.success && res.data.url) {
        setAvatar(res.data.url);
      } else {
        setAvatar(dataUrl);
      }
    } catch (err) {
      setAvatar(dataUrl);
    }
  };

  const handleRemovePhoto = () => {
    setAvatar('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    await updateProfile({
      name,
      phone,
      avatar,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <DashboardLayout
      title="Profile & Privacy Settings"
      subtitle="Manage your personal details and control your optional profile photo."
    >
      <div className="max-w-2xl space-y-8">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile settings updated successfully.</span>
          </div>
        )}

        {/* Profile Photo Privacy Card */}
        <Card className="border-stone-200 shadow-soft">
          <h3 className="text-base font-bold text-stone-900 mb-1">
            Optional Profile Photo
          </h3>
          <p className="text-xs text-stone-500 mb-5">
            Profile photos are entirely optional. They are kept private by default and never required to book a stay.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar Preview */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-2xl border-2 border-emerald-300 shadow-sm">
                {avatar ? (
                  <img src={getMediaUrl(avatar)} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  name.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-3 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  icon={Upload}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatar ? 'Replace Photo' : 'Upload Photo'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Camera}
                  onClick={() => setIsCameraOpen(true)}
                >
                  Use Camera
                </Button>

                {avatar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={handleRemovePhoto}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                Supports JPG, PNG, WEBP up to 5MB. Photo preview updates immediately.
              </p>
            </div>
          </div>

          {/* Strict Privacy Guarantee Box */}
          <div className="mt-6 p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
              <EyeOff className="w-4 h-4 text-emerald-600" />
              <span>Strict Guest Photo Privacy Rule</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Your profile photo is never displayed publicly or shared with platform administrators. Only the specific property host whose hotel you have reserved may view it for verification during your stay.
            </p>
          </div>
        </Card>

        {/* Personal Info Form */}
        <Card className="border-stone-200 shadow-soft">
          <h3 className="text-base font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100">
            Personal Information
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              icon={User}
              placeholder="e.g. Rohit Kumar Singh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              value={email}
              disabled
              helperText="Email address is associated with your authentication account and cannot be modified directly."
            />

            <Input
              label="Phone Number"
              type="tel"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Used for booking confirmation SMS and reception check-in verification."
            />

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>

        {/* Camera Modal */}
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
          title="Capture Guest Profile Photo"
        />
      </div>
    </DashboardLayout>
  );
}
