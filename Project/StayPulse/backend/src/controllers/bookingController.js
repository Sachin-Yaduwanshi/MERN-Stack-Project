import crypto from 'crypto';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Room from '../models/Room.js';
import Property from '../models/Property.js';
import RoomReservationSlot from '../models/RoomReservationSlot.js';

/**
 * Configurable GST Tax Rate
 * Defaults to 0.12 (12% standard Indian hospitality GST).
 * Can be overridden via validated GST_TAX_RATE environment variable (0.00 to 0.28).
 */
export const getGSTRate = () => {
  const envVal = process.env.GST_TAX_RATE;
  if (envVal !== undefined) {
    const parsed = parseFloat(envVal);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 0.28) {
      return parsed;
    }
  }
  return 0.12; // 12% standard Indian hospitality GST project assumption
};

/**
 * Clean up expired unconfirmed reservation slots.
 * Protects against abandoned locks caused by server crashes or network disconnections
 * before booking persistence, without ever touching confirmed bookings or active leases.
 */
export const cleanupExpiredReservationSlots = async () => {
  try {
    await RoomReservationSlot.deleteMany({
      booking: null,
      status: 'PENDING',
      expiresAt: { $lt: new Date() },
    });
  } catch (err) {
    console.error('[Slot Recovery Warning] Failed to clean expired slots:', err.message);
  }
};

/**
 * Conditionally renews an in-flight reservation lease for long-running operations.
 * Only extends slots that are still in PENDING status under the specific lockToken.
 *
 * @param {string} lockToken - Cryptographic lock identifier
 * @param {number} additionalMs - Additional lease duration in milliseconds (default 60s)
 */
export const renewReservationLease = async (lockToken, additionalMs = 60000) => {
  if (!lockToken) return { matchedCount: 0, modifiedCount: 0 };
  return await RoomReservationSlot.updateMany(
    { lockToken, status: 'PENDING' },
    { $set: { expiresAt: new Date(Date.now() + additionalMs) } }
  );
};

/**
 * Generate calendar date strings (YYYY-MM-DD) for every reserved night of a stay.
 * Stays run [checkInDate, checkOutDate). The checkout date itself is NOT a reserved night,
 * which naturally permits back-to-back reservations.
 *
 * @param {Date|string} checkInDate
 * @param {Date|string} checkOutDate
 * @returns {string[]} Array of date strings: ['YYYY-MM-DD', ...]
 */
export const generateStayDateStrings = (checkInDate, checkOutDate) => {
  const dates = [];
  const current = new Date(checkInDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(checkOutDate);
  end.setHours(0, 0, 0, 0);

  while (current < end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

/**
 * Generate unique human-readable booking reference: SP-YYYY-XXXXXX
 */
const generateBookingReference = () => {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SP-${year}-${randomPart}`;
};

/**
 * POST /api/bookings
 * Authenticated booking creation for GUEST accounts.
 *
 * Concurrency Safety & Orphan Recovery Architecture:
 * - Employs database-level unique compound index { room: 1, dateString: 1 } across multi-process clusters.
 * - Each reservation attempt acquires a leased lock with a unique lockToken and 60-second expiration.
 * - Confirmed bookings have 'expiresAt' unset and status set to 'CONFIRMED', permanently locking the dates.
 *
 * Standalone MongoDB Transactional Limitation:
 * - Because standalone MongoDB deployments (without replica set clustering) do not support multi-document
 *   transactions (session.startTransaction()), full engine-level multi-document atomicity across 'Booking'
 *   and 'RoomReservationSlot' cannot be provided.
 * - If an uncatchable catastrophic failure (e.g., kill -9 or physical server power loss) occurs in the narrow
 *   microsecond window after 'booking.save()' completes but before 'RoomReservationSlot.updateMany()' executes,
 *   an orphaned unconfirmed Booking document could remain.
 * - Mitigating Architecture: The reservation slots themselves are strictly leased with a 60-second 'expiresAt'
 *   and backed by a TTL index and active sweep, guaranteeing that room calendar dates will NEVER be permanently
 *   blocked or leaked. If any recoverable error occurs, the invariant check (matchedCount === nights) triggers
 *   an explicit compensating rollback that deletes the Booking document.
 */
export const createBooking = async (req, res, next) => {
  const reservationLockId = crypto.randomUUID();
  let createdDateStrings = [];
  let roomIdRef = null;

  try {
    const { roomId, checkInDate, checkOutDate, guestsCount } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid roomId.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roomId format.',
      });
    }

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both checkInDate and checkOutDate.',
      });
    }

    const count = parseInt(guestsCount, 10);
    if (isNaN(count) || count < 1) {
      return res.status(400).json({
        success: false,
        message: 'Guest count must be at least 1.',
      });
    }

    // Parse and normalize dates (calendar-day based comparison)
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Expected YYYY-MM-DD or ISO date string.',
      });
    }

    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date cannot be in the past.',
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be strictly after check-in date.',
      });
    }

    // Step 1: Sweep any expired abandoned slots before checking availability
    await cleanupExpiredReservationSlots();

    // Step 2: Verify room existence and status
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    if (room.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: `Selected room is currently ${room.status.toLowerCase()} and cannot be reserved.`,
      });
    }

    // Step 3: Verify room capacity
    if (count > room.capacity) {
      return res.status(400).json({
        success: false,
        message: `Guest count (${count}) exceeds maximum room capacity of ${room.capacity}.`,
      });
    }

    // Step 4: Verify property existence and active status
    const property = await Property.findById(room.property);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Associated property not found.',
      });
    }

    if (property.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Associated property is not currently active for reservations.',
      });
    }

    // Generate night date strings: ['YYYY-MM-DD', ...]
    const dateStrings = generateStayDateStrings(checkIn, checkOut);
    const nights = dateStrings.length;

    if (nights < 1) {
      return res.status(400).json({
        success: false,
        message: 'Reservation must be for at least 1 night.',
      });
    }

    roomIdRef = room._id;
    createdDateStrings = dateStrings;

    // Step 5: Defensive overlap check against confirmed Booking records
    const conflictingBooking = await Booking.findOne({
      room: room._id,
      status: { $in: ['CONFIRMED', 'PENDING'] },
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: 'Selected room is already reserved for the chosen date range.',
        conflict: {
          existingCheckIn: conflictingBooking.checkInDate,
          existingCheckOut: conflictingBooking.checkOutDate,
        },
      });
    }

    // Step 6: Atomic Database Reservation Slot Insertion
    // Each slot document contains a 60-second lease (expiresAt) and a unique lockToken.
    // MongoDB WiredTiger enforces { room: 1, dateString: 1 } uniqueness atomically.
    const slotDocs = dateStrings.map((dateStr) => ({
      room: room._id,
      dateString: dateStr,
      booking: null,
      status: 'PENDING',
      lockToken: reservationLockId,
      expiresAt: new Date(Date.now() + 60000), // 60s lease for in-flight confirmation
    }));

    try {
      await RoomReservationSlot.insertMany(slotDocs, { ordered: true });
    } catch (slotErr) {
      if (
        slotErr.code === 11000 ||
        (slotErr.writeErrors && slotErr.writeErrors.some((e) => e.code === 11000))
      ) {
        // Rollback any slots placed under this request's lockToken only
        await RoomReservationSlot.deleteMany({ lockToken: reservationLockId });

        return res.status(409).json({
          success: false,
          message: 'Selected room is already reserved for the chosen date range.',
        });
      }
      throw slotErr;
    }

    // Step 7: Server-side financial calculations (Never trust amounts supplied by client)
    const pricePerNight = room.pricePerNight;
    const subtotal = pricePerNight * nights;
    const gstRate = getGSTRate();
    const taxes = Math.round(subtotal * gstRate);
    const totalPrice = subtotal + taxes;

    // Step 8: Generate unique booking reference
    let bookingReference = generateBookingReference();
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 5) {
      const existing = await Booking.findOne({ bookingReference });
      if (!existing) {
        isUnique = true;
      } else {
        bookingReference = generateBookingReference();
        attempts++;
      }
    }

    const booking = new Booking({
      bookingReference,
      guest: req.user._id,
      property: property._id,
      room: room._id,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guestsCount: count,
      nights,
      pricePerNight,
      subtotal,
      taxes,
      totalPrice,
      status: 'CONFIRMED',
    });

    try {
      await booking.save();
    } catch (saveErr) {
      // Clean rollback of this specific request's reservation slots on save failure
      await RoomReservationSlot.deleteMany({ lockToken: reservationLockId });
      throw saveErr;
    }

    // Step 9: Atomically associate confirmed booking ID and permanently remove expiration lease
    // Strict invariant: Verify conditional ownership under this lockToken
    const updateResult = await RoomReservationSlot.updateMany(
      {
        room: room._id,
        dateString: { $in: dateStrings },
        lockToken: reservationLockId,
        status: 'PENDING',
      },
      {
        $set: { booking: booking._id, status: 'CONFIRMED' },
        $unset: { expiresAt: 1 },
      }
    );

    // Invariant Check: Exactly all nights must have been successfully confirmed.
    // If the lease expired during an unexpected delay and slots were swept before confirmation:
    if (updateResult.matchedCount !== nights) {
      // Compensating action: Delete the created Booking document immediately to maintain zero ghost bookings
      await Booking.findByIdAndDelete(booking._id);
      await RoomReservationSlot.deleteMany({ lockToken: reservationLockId });

      return res.status(409).json({
        success: false,
        message: 'Reservation lock timed out prior to confirmation. Please retry.',
      });
    }

    // Populate property and room details for response confirmation
    await booking.populate([
      { path: 'property', select: 'name location coverImage contactPhone contactEmail amenities' },
      { path: 'room', select: 'roomType bedType pricePerNight capacity images' },
    ]);

    return res.status(201).json({
      success: true,
      message: 'Reservation confirmed successfully.',
      booking,
      pricingDetails: {
        gstRateApplied: gstRate,
        gstRatePercentage: `${Math.round(gstRate * 100)}%`,
        isDemoValidation: true,
        settlementStatus: 'UNPAID_DEMO_RESERVATION',
      },
    });
  } catch (error) {
    if (createdDateStrings.length > 0) {
      try {
        await RoomReservationSlot.deleteMany({ lockToken: reservationLockId });
      } catch (cleanErr) {
        // ignore cleanup error
      }
    }
    next(error);
  }
};

/**
 * GET /api/bookings/my-bookings
 * Restricted to authenticated GUEST accounts.
 * Fetches all bookings belonging to the requesting guest only.
 */
export const getMyGuestBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ guest: req.user._id })
      .populate('property', 'name location coverImage contactPhone contactEmail amenities')
      .populate('room', 'roomType bedType pricePerNight capacity images')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/:id
 * Fetches booking details by ID with strict role-based privacy:
 * - GUEST can only view their own booking.
 * - PROPERTY_OWNER can only view bookings for properties they own.
 * - PLATFORM_ADMIN is strictly forbidden from viewing individual guest booking records.
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format.',
      });
    }

    // Platform Admin Privacy Check: Zero access to individual guest booking records
    if (req.user.role === 'PLATFORM_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform Administrators cannot view individual guest booking records.',
      });
    }

    const booking = await Booking.findById(id)
      .populate('property', 'name location coverImage contactPhone contactEmail owner')
      .populate('room', 'roomType bedType pricePerNight capacity images')
      .populate('guest', 'name email phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Guest privacy check
    if (req.user.role === 'GUEST') {
      if (booking.guest._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own bookings.',
        });
      }
    }

    // Property Owner ownership check
    if (req.user.role === 'PROPERTY_OWNER') {
      const propertyOwnerId =
        booking.property?.owner?._id?.toString() || booking.property?.owner?.toString();
      if (propertyOwnerId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view bookings for your own properties.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/bookings/:id/cancel
 * Allows authenticated GUEST to cancel their own active reservation prior to check-in.
 * Immediately deletes the database reservation slots belonging to this booking,
 * cleanly releasing the dates for other guests.
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format.',
      });
    }

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    // Assert ownership
    if (booking.guest.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own bookings.',
      });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'This booking has already been cancelled.',
      });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed booking.',
      });
    }

    // Cancellation rule: cannot cancel on or after check-in date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(booking.checkInDate);
    checkIn.setHours(0, 0, 0, 0);

    if (today >= checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Reservations cannot be cancelled on or after the scheduled check-in date.',
      });
    }

    // Delete database-level reservation slots strictly matching this booking ID
    await RoomReservationSlot.deleteMany({ booking: booking._id });

    booking.status = 'CANCELLED';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason?.trim() || 'Cancelled by guest';

    await booking.save();

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully. Dates are now released.',
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/owner/my-bookings
 * Restricted to PROPERTY_OWNER accounts.
 * Returns reservations solely for properties owned by this owner.
 */
export const getOwnerBookings = async (req, res, next) => {
  try {
    // 1. Find properties owned by this owner
    const ownerProperties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = ownerProperties.map((p) => p._id);

    // 2. Fetch bookings strictly for these properties
    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('guest', 'name email phone') // Essential contact info for hospitality coordination
      .populate('property', 'name location coverImage')
      .populate('room', 'roomType bedType pricePerNight capacity')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/bookings/owner/:id/status
 * Allows PROPERTY_OWNER to update status (CONFIRMED, COMPLETED, CANCELLED) for their property's booking.
 * Enforces strict lifecycle state machine:
 * - Terminal states (CANCELLED, COMPLETED) cannot be modified.
 * - Future stays cannot be marked as COMPLETED before the scheduled check-out date.
 */
export const updateBookingStatusByOwner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format.',
      });
    }

    const allowedStatuses = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`,
      });
    }

    const booking = await Booking.findById(id).populate('property', 'owner');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      });
    }

    const ownerId = booking.property?.owner?.toString();
    if (ownerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own the property for this booking.',
      });
    }

    // Strict State Machine: Terminal states cannot be updated
    if (booking.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition. A cancelled reservation cannot be updated.',
      });
    }

    if (booking.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Invalid status transition. A completed reservation cannot be updated.',
      });
    }

    // Strict Validation: Cannot complete a future stay before check-out date
    if (status === 'COMPLETED') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkOut = new Date(booking.checkOutDate);
      checkOut.setHours(0, 0, 0, 0);

      if (today < checkOut) {
        return res.status(400).json({
          success: false,
          message: 'Cannot mark a reservation as COMPLETED before the scheduled check-out date.',
        });
      }
    }

    // If owner cancels, release database reservation slots
    if (status === 'CANCELLED') {
      await RoomReservationSlot.deleteMany({ booking: booking._id });
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason?.trim() || 'Cancelled by property owner';
    }

    booking.status = status;
    await booking.save();

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/admin/stats
 * Restricted to PLATFORM_ADMIN.
 * Delivers aggregate counts ONLY. Zero guest private data or booking records are exposed.
 */
export const getAdminBookingStats = async (req, res, next) => {
  try {
    const [totalBookings, confirmedBookings, completedBookings, cancelledBookings, revenueAgg] =
      await Promise.all([
        Booking.countDocuments(),
        Booking.countDocuments({ status: 'CONFIRMED' }),
        Booking.countDocuments({ status: 'COMPLETED' }),
        Booking.countDocuments({ status: 'CANCELLED' }),
        Booking.aggregate([
          { $match: { status: { $in: ['CONFIRMED', 'COMPLETED'] } } },
          { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
        ]),
      ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        estimatedGrossBookingValue: totalRevenue,
        totalRevenue, // Backward-compatible alias
        settlementNotice:
          'Demo validation active. Figures represent uncollected reservation agreement values, not processed bank transactions.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/rooms/:roomId/availability
 * Public or authenticated check for room availability across date ranges.
 */
export const checkRoomAvailability = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { checkInDate, checkOutDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid roomId format.',
      });
    }

    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both checkInDate and checkOutDate as query parameters.',
      });
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format.',
      });
    }

    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);

    // Verify room existence and property active status
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found.',
      });
    }

    const property = await Property.findById(room.property);
    if (!property || property.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Associated property is not currently active for reservations.',
      });
    }

    // Clean up expired abandoned slots
    await cleanupExpiredReservationSlots();

    const dateStrings = generateStayDateStrings(checkIn, checkOut);

    // Check both reservation slots and active booking records
    const [slotConflict, conflictingBooking] = await Promise.all([
      RoomReservationSlot.findOne({
        room: roomId,
        dateString: { $in: dateStrings },
      }),
      Booking.findOne({
        room: roomId,
        status: { $in: ['CONFIRMED', 'PENDING'] },
        checkInDate: { $lt: checkOut },
        checkOutDate: { $gt: checkIn },
      }),
    ]);

    const isAvailable = !slotConflict && !conflictingBooking;

    return res.status(200).json({
      success: true,
      available: isAvailable,
      message: isAvailable
        ? 'Room is available for selected dates.'
        : 'Room is already reserved for selected dates.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/bookings/owner/analytics
 * Provides real-time dashboard analytics for the authenticated PROPERTY_OWNER.
 * Returns revenue, booking counts, room counts, and recent bookings scoped strictly
 * to properties owned by this user.
 */
export const getOwnerAnalytics = async (req, res, next) => {
  try {
    const ownerProperties = await Property.find({ owner: req.user._id }).select('_id name');
    const propertyIds = ownerProperties.map((p) => p._id);

    const [
      totalRooms,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      revenueAgg,
      recentBookings,
    ] = await Promise.all([
      Room.countDocuments({ property: { $in: propertyIds } }),
      Booking.countDocuments({ property: { $in: propertyIds } }),
      Booking.countDocuments({ property: { $in: propertyIds }, status: 'CONFIRMED' }),
      Booking.countDocuments({ property: { $in: propertyIds }, status: 'COMPLETED' }),
      Booking.countDocuments({ property: { $in: propertyIds }, status: 'CANCELLED' }),
      Booking.aggregate([
        { $match: { property: { $in: propertyIds }, status: { $in: ['CONFIRMED', 'COMPLETED'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
      ]),
      Booking.find({ property: { $in: propertyIds } })
        .populate('guest', 'name email phone')
        .populate('property', 'name location coverImage')
        .populate('room', 'roomType bedType pricePerNight capacity')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    return res.status(200).json({
      success: true,
      analytics: {
        propertiesCount: propertyIds.length,
        roomsCount: totalRooms,
        totalBookings,
        activeBookings: confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        recentBookings,
        settlementNotice:
          'Demo validation active. Revenue represents uncollected guest reservation agreement values.',
      },
    });
  } catch (error) {
    next(error);
  }
};
