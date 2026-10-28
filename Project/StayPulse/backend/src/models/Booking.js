import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must be associated with a guest'],
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Booking must reference a property'],
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: [true, 'Booking must reference a specific room'],
      index: true,
    },
    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required'],
      index: true,
    },
    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required'],
      index: true,
      validate: {
        validator: function (value) {
          return value > this.checkInDate;
        },
        message: 'Check-out date must be strictly after check-in date',
      },
    },
    guestsCount: {
      type: Number,
      required: [true, 'Number of guests is required'],
      min: [1, 'At least 1 guest is required'],
    },
    nights: {
      type: Number,
      required: [true, 'Number of nights must be calculated'],
      min: [1, 'Booking must be for at least 1 night'],
    },
    // Server-Calculated Pricing (never trust client amounts)
    pricePerNight: {
      type: Number,
      required: true,
      min: [0, 'Price per night cannot be negative'],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative'],
    },
    taxes: {
      type: Number,
      required: true,
      min: [0, 'Taxes cannot be negative'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
        message: '{VALUE} is not a valid booking status',
      },
      default: 'CONFIRMED',
      index: true,
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for high-performance overlapping booking checks (Concurrency protection)
bookingSchema.index({ room: 1, checkInDate: 1, checkOutDate: 1, status: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });
bookingSchema.index({ property: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
