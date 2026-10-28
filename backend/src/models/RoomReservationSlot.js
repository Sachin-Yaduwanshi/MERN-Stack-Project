import mongoose from 'mongoose';

/**
 * RoomReservationSlot Model
 *
 * Implements a database-enforced, cross-process atomic reservation strategy.
 * Each document represents a single calendar night reserved for a specific room.
 *
 * Exclusivity Guarantees:
 * - Compound index { room: 1, dateString: 1 } has a STRICT UNIQUE constraint
 *   enforced by MongoDB's WiredTiger storage engine across any number of Node.js processes.
 *
 * Orphaned Slot Recovery (Lease-Based Pattern):
 * - Unconfirmed slots are inserted in 'PENDING' status with a unique 'lockToken' and 'expiresAt' timestamp (60s lease).
 * - MongoDB TTL Index { expiresAt: 1 } with expireAfterSeconds: 0 automatically sweeps abandoned slots.
 * - Active application sweep (deleteMany where booking: null and expiresAt < now) guarantees instantaneous
 *   recovery even before the background TTL daemon triggers.
 * - When a booking is confirmed, 'expiresAt' is $unset and status becomes 'CONFIRMED', permanently protecting
 *   confirmed reservations from expiration.
 */
const roomReservationSlotSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Reservation slot must reference a room'],
      index: true,
    },
    dateString: {
      type: String, // Format: 'YYYY-MM-DD'
      required: [true, 'Date string is required (YYYY-MM-DD)'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date string must be in YYYY-MM-DD format'],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED'],
      default: 'PENDING',
      index: true,
    },
    lockToken: {
      type: String,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// STRICT DATABASE-LEVEL UNIQUE COMPOUND INDEX:
// Enforces zero overlapping night reservations across all server processes.
roomReservationSlotSchema.index({ room: 1, dateString: 1 }, { unique: true });

// TTL INDEX:
// Automatically purges expired unconfirmed slots (confirmed slots have expiresAt = null and are ignored).
roomReservationSlotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RoomReservationSlot = mongoose.model(
  'RoomReservationSlot',
  roomReservationSlotSchema
);

export default RoomReservationSlot;
