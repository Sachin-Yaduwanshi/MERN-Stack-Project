import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle, Upload, X } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function CameraCaptureModal({
  isOpen,
  onClose,
  onCapture,
  title = "Take Photo with Camera",
  aspectRatio = "4/3"
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const fileFallbackRef = useRef(null);

  // Stop camera stream safely and release hardware tracks
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Start camera ONLY upon user opening or selecting camera
  const startCamera = async () => {
    setErrorMessage(null);
    setCapturedImage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser environment. Please use file upload.');
      }

      // Do NOT request microphone access — video ONLY
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setHasPermission(true);
    } catch (err) {
      console.warn('Camera permission or availability error:', err);
      setHasPermission(false);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser permissions or use file upload.'
          : err.message || 'Unable to connect to camera device. Please use file upload.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
      setCapturedImage(null);
      setErrorMessage(null);
    }
    return () => {
      stopStream();
    };
  }, [isOpen]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    stopStream();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (capturedImage && onCapture) {
      onCapture(capturedImage);
      onClose();
    }
  };

  const handleFileFallbackChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage('Only image files (JPEG, PNG, WEBP) are permitted.');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Image size must be less than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedImage(reader.result);
        stopStream();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Capture live photo using your device camera or select a local file."
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Error / Fallback Banner */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="flex-1">
              <p className="font-semibold">Camera Access Notice</p>
              <p className="mt-0.5">{errorMessage}</p>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileFallbackRef}
                  className="hidden"
                  onChange={handleFileFallbackChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  icon={Upload}
                  onClick={() => fileFallbackRef.current?.click()}
                  className="bg-white"
                >
                  Choose File from Device Instead
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Video stream or Captured image container */}
        <div className="relative rounded-2xl overflow-hidden bg-stone-900 aspect-video flex items-center justify-center border border-stone-800">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              {!cameraActive && !errorMessage && (
                <div className="text-center p-6 text-stone-400">
                  <Camera className="w-10 h-10 mx-auto mb-2 text-stone-500 animate-pulse" />
                  <p className="text-xs">Connecting to device camera...</p>
                </div>
              )}
            </>
          ) : (
            <img
              src={capturedImage}
              alt="Captured preview"
              className="w-full h-full object-cover"
            />
          )}

          {/* Camera indicator */}
          {cameraActive && !capturedImage && (
            <div className="absolute top-3 left-3 bg-stone-950/70 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Camera Feed
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          {!capturedImage ? (
            <>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileFallbackRef}
                  className="hidden"
                  onChange={handleFileFallbackChange}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Upload}
                  onClick={() => fileFallbackRef.current?.click()}
                >
                  Upload File
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Camera}
                  onClick={capturePhoto}
                  disabled={!cameraActive}
                >
                  Capture Photo
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={retakePhoto}
              >
                Retake
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Discard
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  onClick={handleConfirm}
                >
                  Use This Photo
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
