import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root uploads directory
export const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

// Ensure upload subdirectories exist
export const ensureUploadDirs = () => {
  const dirs = [
    UPLOADS_ROOT,
    path.join(UPLOADS_ROOT, 'properties'),
    path.join(UPLOADS_ROOT, 'rooms'),
    path.join(UPLOADS_ROOT, 'profiles'),
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

ensureUploadDirs();

/**
 * Validates actual file magic bytes to verify genuine image content,
 * preventing malicious files disguised with .jpg/.png extensions.
 *
 * @param {Buffer} buffer - File header buffer
 * @returns {string|null} Detected image format ('jpeg', 'png', 'webp') or null if invalid
 */
export const validateImageMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: Starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: Starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WEBP: Starts with RIFF (52 49 46 46) and bytes 8..11 are WEBP (57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
};

// Multer memory storage allows validating magic bytes before saving to disk
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, and WEBP images are permitted.'));
    }
  },
});

/**
 * Saves a verified image buffer to the designated category folder
 * with an unpredictable filename to prevent predictable resource paths.
 *
 * @param {Buffer} buffer - Validated image buffer
 * @param {string} category - 'properties' | 'rooms' | 'profiles'
 * @param {string} ext - 'jpg' | 'png' | 'webp'
 * @returns {string} Relative URL for serving
 */
export const saveImageBuffer = (buffer, category, ext) => {
  const safeCategory = ['properties', 'rooms', 'profiles'].includes(category)
    ? category
    : 'properties';
  const extension = ext.startsWith('.') ? ext : `.${ext}`;
  const filename = `${safeCategory}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
  const targetDir = path.join(UPLOADS_ROOT, safeCategory);
  const targetPath = path.join(targetDir, filename);

  fs.writeFileSync(targetPath, buffer);
  return `/api/uploads/${safeCategory}/${filename}`;
};

/**
 * Handles base64 Data URLs (e.g., from camera snapshots)
 *
 * @param {string} dataUrl - e.g. "data:image/jpeg;base64,..."
 * @param {string} category - 'properties' | 'rooms' | 'profiles'
 * @returns {string} Serving URL
 */
export const saveBase64Image = (dataUrl, category = 'properties') => {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid image data URL format.');
  }

  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Enforce 5MB limit
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image size exceeds 5MB limit.');
  }

  const detectedFormat = validateImageMagicBytes(buffer);
  if (!detectedFormat) {
    throw new Error('Corrupted or invalid image content detected.');
  }

  const ext = detectedFormat === 'jpeg' ? 'jpg' : detectedFormat;
  return saveImageBuffer(buffer, category, ext);
};
