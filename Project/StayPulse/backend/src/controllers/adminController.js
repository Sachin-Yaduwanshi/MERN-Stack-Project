import mongoose from 'mongoose';
import User from '../models/User.js';
import Property from '../models/Property.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { getGSTRate } from './bookingController.js';

/**
 * GET /api/admin/overview
 * Platform Administrator Aggregate Metrics
 *
 * MANDATORY PRIVACY GUARANTEE:
 * Returns strictly high-level system aggregates, user distribution counts,
 * and property moderation stats. NEVER returns individual guest booking histories,
 * private travel records, guest contact information, or guest profile photos.
 */
export const getAdminOverview = async (req, res, next) => {
  try {
    const [
      totalUsers,
      guestsCount,
      ownersCount,
      suspendedUsers,
      totalProperties,
      activeProperties,
      inactiveProperties,
      pendingProperties,
      rejectedProperties,
      totalRooms,
      totalBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      revenueAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'GUEST' }),
      User.countDocuments({ role: 'PROPERTY_OWNER' }),
      User.countDocuments({ status: 'SUSPENDED' }),
      Property.countDocuments(),
      Property.countDocuments({ status: 'ACTIVE' }),
      Property.countDocuments({ status: 'INACTIVE' }),
      Property.countDocuments({ status: 'PENDING_APPROVAL' }),
      Property.countDocuments({ status: 'REJECTED' }),
      Room.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'CONFIRMED' }),
      Booking.countDocuments({ status: 'COMPLETED' }),
      Booking.countDocuments({ status: 'CANCELLED' }),
      Booking.aggregate([
        { $match: { status: { $in: ['CONFIRMED', 'COMPLETED'] } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
      ]),
    ]);

    const grossBookingVolume = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;
    const dbState = mongoose.connection.readyState;
    const dbStatusMap = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return res.status(200).json({
      success: true,
      overview: {
        users: {
          total: totalUsers,
          guests: guestsCount,
          owners: ownersCount,
          suspended: suspendedUsers,
        },
        properties: {
          total: totalProperties,
          active: activeProperties,
          inactive: inactiveProperties,
          pending: pendingProperties,
          rejected: rejectedProperties,
        },
        rooms: {
          total: totalRooms,
        },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
          grossBookingVolume,
          totalRevenue: grossBookingVolume,
        },
        system: {
          status: 'operational',
          uptimeSeconds: Math.floor(process.uptime()),
          database: dbStatusMap[dbState] || 'unknown',
          configuredGSTRate: getGSTRate(),
          configuredGSTRatePercentage: `${Math.round(getGSTRate() * 100)}%`,
          settlementNotice:
            'Demo validation mode active. Financial aggregates represent uncollected agreement totals.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/users
 * Lists registered accounts for administrative oversight.
 *
 * PRIVACY FIREWALL ENFORCEMENT:
 * - Guest avatars and phone numbers are suppressed from admin views to maintain guest privacy.
 * - Password hashes are never selected.
 * - Owner avatars are only returned if ownerAvatarVisible is true.
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};

    if (role && ['GUEST', 'PROPERTY_OWNER', 'PLATFORM_ADMIN'].includes(role)) {
      filter.role = role;
    }

    if (status && ['ACTIVE', 'SUSPENDED'].includes(status)) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const rawUsers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    // Enforce privacy firewall transformation
    const sanitizedUsers = rawUsers.map((u) => {
      const userObj = u.toObject();

      if (userObj.role === 'GUEST') {
        // Suppress private guest profile photos and phone numbers
        delete userObj.avatar;
        delete userObj.phone;
      } else if (userObj.role === 'PROPERTY_OWNER') {
        // If owner chose to hide avatar, omit it
        if (!userObj.ownerAvatarVisible) {
          delete userObj.avatar;
        }
      }

      return userObj;
    });

    return res.status(200).json({
      success: true,
      count: sanitizedUsers.length,
      users: sanitizedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/users/:id/status
 * Suspends or reactivates a user account.
 * Guard: Admin cannot suspend their own account.
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format.',
      });
    }

    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either ACTIVE or SUSPENDED.',
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change the status of your own administrative account.',
      });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.status = status;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User account status successfully updated to ${status}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/properties
 * Lists all properties across the platform for moderation review.
 */
export const getAdminProperties = async (req, res, next) => {
  try {
    const { status, city } = req.query;
    const filter = {};

    if (status && ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED'].includes(status)) {
      filter.status = status;
    }

    if (city && city !== 'ALL') {
      filter['location.city'] = { $regex: new RegExp(`^${city.trim()}$`, 'i') };
    }

    const properties = await Property.find(filter)
      .populate('owner', 'name email phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    // Populate room count for each property
    const propertyIds = properties.map((p) => p._id);
    const roomCounts = await Room.aggregate([
      { $match: { property: { $in: propertyIds } } },
      { $group: { _id: '$property', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    roomCounts.forEach((rc) => {
      countMap[rc._id.toString()] = rc.count;
    });

    const enrichedProperties = properties.map((p) => {
      const pObj = p.toObject();
      pObj.roomCount = countMap[p._id.toString()] || 0;
      return pObj;
    });

    return res.status(200).json({
      success: true,
      count: enrichedProperties.length,
      properties: enrichedProperties,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/properties/:id/status
 * Moderation action: Approve (ACTIVE), Reject (REJECTED), or toggle INACTIVE.
 * Stores rejectionReason, reviewedAt, and reviewedBy.
 */
export const updatePropertyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid property ID format.',
      });
    }

    if (!['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be ACTIVE, INACTIVE, PENDING_APPROVAL, or REJECTED.',
      });
    }

    const property = await Property.findById(id).populate('owner', 'name email');
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found.',
      });
    }

    property.status = status;
    property.reviewedAt = new Date();
    property.reviewedBy = req.user._id;

    if (status === 'REJECTED') {
      property.rejectionReason =
        rejectionReason?.trim() ||
        'Listing application did not meet platform quality or verification standards.';
    } else if (status === 'ACTIVE') {
      property.rejectionReason = ''; // Clear rejection reason upon approval
    }

    await property.save();

    return res.status(200).json({
      success: true,
      message: `Property listing status successfully updated to ${status}.`,
      property,
    });
  } catch (error) {
    next(error);
  }
};
