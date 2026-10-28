import express from 'express';
import {
  getAdminOverview,
  getAdminUsers,
  updateUserStatus,
  getAdminProperties,
  updatePropertyStatus,
} from '../controllers/adminController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Strict platform administrator protection across all admin routes
router.use(verifyToken, authorizeRoles('PLATFORM_ADMIN'));

/**
 * Platform Metrics & System Overview
 */
router.get('/overview', getAdminOverview);

/**
 * User Account Oversight & Moderation
 */
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', updateUserStatus);

/**
 * Property Moderation & Status Management
 */
router.get('/properties', getAdminProperties);
router.patch('/properties/:id/status', updatePropertyStatus);

export default router;
