import express from 'express';
import {
  createBooking,
  getMyGuestBookings,
  getBookingById,
  cancelBooking,
  getOwnerBookings,
  updateBookingStatusByOwner,
  getAdminBookingStats,
  checkRoomAvailability,
  getOwnerAnalytics,
} from '../controllers/bookingController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

/**
 * Public Room Availability Check
 */
router.get('/rooms/:roomId/availability', checkRoomAvailability);

/**
 * Platform Admin Aggregate Statistics (Zero individual guest data)
 */
router.get(
  '/admin/stats',
  verifyToken,
  authorizeRoles('PLATFORM_ADMIN'),
  getAdminBookingStats
);

/**
 * Property Owner Booking Management
 */
router.get(
  '/owner/my-bookings',
  verifyToken,
  authorizeRoles('PROPERTY_OWNER'),
  getOwnerBookings
);

router.get(
  '/owner/analytics',
  verifyToken,
  authorizeRoles('PROPERTY_OWNER'),
  getOwnerAnalytics
);

router.patch(
  '/owner/:id/status',
  verifyToken,
  authorizeRoles('PROPERTY_OWNER'),
  updateBookingStatusByOwner
);

/**
 * Guest Booking Management
 */
router.post(
  '/',
  verifyToken,
  authorizeRoles('GUEST'),
  createBooking
);

router.get(
  '/my-bookings',
  verifyToken,
  authorizeRoles('GUEST'),
  getMyGuestBookings
);

router.patch(
  '/:id/cancel',
  verifyToken,
  authorizeRoles('GUEST'),
  cancelBooking
);

/**
 * Individual Booking Details
 * Access is restricted inside getBookingById:
 * - GUEST can view their own booking
 * - PROPERTY_OWNER can view bookings for their properties
 * - PLATFORM_ADMIN receives 403 Forbidden (Strict privacy requirement)
 */
router.get(
  '/:id',
  verifyToken,
  getBookingById
);

export default router;
