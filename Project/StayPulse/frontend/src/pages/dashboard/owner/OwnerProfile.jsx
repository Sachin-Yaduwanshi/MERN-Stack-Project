import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Upload,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Camera,
  Building2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { uploadAPI, getMediaUrl } from '../../../services/api';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import CameraCaptureModal from '../../../components/ui/CameraCaptureModal';

export default function OwnerProfile() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98111 22334');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [avatarVisibleToGuests, setAvatarVisibleToGuests] = useState(
    user?.ownerAvatarVisible !== undefined
      ? user.ownerAvatarVisible
      : user?.avatarVisibleToGuests !== undefined
      ? user.avatarVisibleToGuests
      : true
  );
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
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

  const handleSave = async (e) => {
    e.preventDefault();
    await updateProfile({
      name,
      phone,
      avatar,
      ownerAvatarVisible: avatarVisibleToGuests,
      avatarVisibleToGuests,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <DashboardLayout
      title="Host Profile & Public Presence"
      subtitle="Manage your partner credentials and guest-facing profile visibility."
    >
      <div className="max-w-2xl space-y-8">
        {savedSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Host profile settings updated successfully.</span>
          </div>
        )}

        {/* Profile Photo & Visibility Settings Card */}
        <Card className="border-stone-200 shadow-soft">
          <h3 className="text-base font-bold text-stone-900 mb-1">
            Host Profile Photo & Guest Visibility
          </h3>
          <p className="text-xs text-stone-500 mb-5">
            Configure your personal picture and control whether guests can view it in the "Meet Your Host" section on hotel pages.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-stone-100">
            {/* Avatar Preview */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-2xl border-2 border-emerald-400 shadow-sm">
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
                    onClick={() => setAvatar('')}
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-stone-400">
                Camera capture supports secure HTTPS / localhost environments.
              </p>
            </div>
          </div>

          {/* Explicit Requirement: "Show my profile photo to guests" setting */}
          <div className="pt-5 space-y-3">
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <div className="space-y-0.5">
                <label
                  htmlFor="guest-visibility-toggle"
                  className="text-xs font-bold text-stone-900 flex items-center gap-1.5 cursor-pointer"
                >
                  {avatarVisibleToGuests ? (
                    <Eye className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-stone-400" />
                  )}
                  Show my profile photo to guests
                </label>
                <p className="text-xs text-stone-500">
                  When enabled, your profile picture appears in the public "Meet Your Host" section on your property details pages. When disabled, your photo is hidden from guest view while preserving your hotel cover photos.
                </p>
              </div>

              <input
                id="guest-visibility-toggle"
                type="checkbox"
                checked={avatarVisibleToGuests}
                onChange={(e) => setAvatarVisibleToGuests(e.target.checked)}
                className="w-5 h-5 mt-1 accent-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </Card>

        {/* Contact Details Form */}
        <Card className="border-stone-200 shadow-soft">
          <h3 className="text-base font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100">
            Host Contact Information
          </h3>

          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Host Name / Brand"
              type="text"
              icon={User}
              placeholder="e.g. Rohit Kumar Singh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Account Email"
              type="email"
              icon={Mail}
              value={email}
              disabled
              helperText="Owner email address is tied to your verified partner account."
            />

            <Input
              label="Business Phone"
              type="tel"
              icon={Phone}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Shared only with confirmed guests who book rooms at your property."
            />

            <div className="pt-2 flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Host Settings
              </Button>
            </div>
          </form>
        </Card>

        {/* Camera Modal */}
        <CameraCaptureModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
          title="Capture Owner Host Photo"
        />
      </div>
    </DashboardLayout>
  );
}
