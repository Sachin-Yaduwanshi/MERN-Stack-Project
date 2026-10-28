import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  upload,
  validateImageMagicBytes,
  saveImageBuffer,
  saveBase64Image,
  UPLOADS_ROOT,
} from '../utils/fileUpload.js';
import { verifyToken } from '../middleware/auth.js';
import { verifyTokenPayload } from '../utils/token.js';
import User from '../models/User.js';

const router = express.Router();

/**
 * POST /api/uploads
 * Uploads an image either as multipart file or base64 DataURL (camera capture).
 * Requires authentication.
 */
router.post(
  '/',
  verifyToken,
  (req, res, next) => {
    if (req.is('multipart/form-data')) {
      upload.single('image')(req, res, (err) => {
        if (err) {
          return res.status(400).json({ success: false, message: err.message });
        }
        next();
      });
    } else {
      next();
    }
  },
  async (req, res, next) => {
    try {
      const category = req.body.category || 'properties';

      // Permission check on category: only PROPERTY_OWNER can upload property or room images
      if (['properties', 'rooms'].includes(category) && req.user.role !== 'PROPERTY_OWNER') {
        return res.status(403).json({
          success: false,
          message: 'Only property owners are authorized to upload property or room images.',
        });
      }

      // Case 1: Multer Multipart file uploaded
      if (req.file) {
        const detected = validateImageMagicBytes(req.file.buffer);
        if (!detected) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or manipulated image file content. File must be genuine JPEG, PNG, or WEBP.',
          });
        }

        const ext = detected === 'jpeg' ? 'jpg' : detected;
        const relativeUrl = saveImageBuffer(req.file.buffer, category, ext);

        return res.status(200).json({
          success: true,
          message: 'Image uploaded successfully.',
          url: relativeUrl,
        });
      }

      // Case 2: Base64 / Camera snapshot Data URL in JSON
      if (req.body.dataUrl) {
        const relativeUrl = saveBase64Image(req.body.dataUrl, category);
        return res.status(200).json({
          success: true,
          message: 'Camera photo saved successfully.',
          url: relativeUrl,
        });
      }

      return res.status(400).json({
        success: false,
        message: 'No image file or dataUrl provided in upload request.',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/uploads/:category/:filename
 * Serves uploaded images securely with path traversal protection and privacy rules:
 * - Property & room photos are publicly viewable.
 * - Guest profile photos are strictly private: Platform Admins and other users are blocked (403).
 * - Property Owner avatars with ownerAvatarVisible=false are suppressed from public/admin viewing (403).
 */
router.get('/:category/:filename', async (req, res, next) => {
  try {
    const { category, filename } = req.params;

    // Strict validation against path traversal
    if (!['properties', 'rooms', 'profiles'].includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid image category.' });
    }

    if (!/^[a-zA-Z0-9_\-\.]+$/.test(filename) || filename.includes('..')) {
      return res.status(400).json({ success: false, message: 'Invalid filename syntax.' });
    }

    const filePath = path.join(UPLOADS_ROOT, category, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Image not found.' });
    }

    // Privacy Firewall for User Profile Photos
    if (category === 'profiles') {
      const profileOwner = await User.findOne({
        avatar: new RegExp(filename, 'i'),
      });

      if (profileOwner) {
        // Extract token if provided in Authorization header or query parameter ?token=...
        let token = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
          token = req.headers.authorization.split(' ')[1];
        } else if (req.query.token) {
          token = req.query.token;
        }

        let decoded = null;
        if (token) {
          try {
            decoded = verifyTokenPayload(token);
          } catch (e) {
            // invalid token
          }
        }

        // Rule 1: Guest Profile Photos are strictly private
        if (profileOwner.role === 'GUEST') {
          if (!decoded) {
            return res.status(401).json({
              success: false,
              message: 'Authentication required to access private guest profile photo.',
            });
          }

          // PLATFORM_ADMIN is strictly prohibited from viewing guest profile photos
          if (decoded.role === 'PLATFORM_ADMIN') {
            return res.status(403).json({
              success: false,
              message: 'Access denied. Platform Administrators cannot view guest profile photos.',
            });
          }

          // Other users cannot view this guest's profile photo
          if (decoded.id.toString() !== profileOwner._id.toString()) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. Guest profile photos are strictly private to the account holder.',
            });
          }
        }

        // Rule 2: Property Owner avatar with ownerAvatarVisible = false is hidden from public/admin
        if (profileOwner.role === 'PROPERTY_OWNER' && !profileOwner.ownerAvatarVisible) {
          if (!decoded || decoded.id.toString() !== profileOwner._id.toString()) {
            return res.status(403).json({
              success: false,
              message: 'Access denied. This host avatar has been set to private.',
            });
          }
        }
      }
    }

    // Set proper Content-Type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
