import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Room must belong to a property'],
      index: true,
    },
    roomType: {
      type: String,
      required: [true, 'Please provide room type (e.g. Deluxe Suite)'],
      trim: true,
      minlength: [2, 'Room type must be at least 2 characters'],
      maxlength: [100, 'Room type cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1500, 'Room description cannot exceed 1500 characters'],
      default: '',
    },
    capacity: {
      type: Number,
      required: [true, 'Please specify maximum guest capacity'],
      min: [1, 'Room capacity must accommodate at least 1 guest'],
      max: [20, 'Room capacity cannot exceed 20 guests'],
    },
    bedType: {
      type: String,
      required: [true, 'Please specify bed configuration (e.g. 1 King Bed)'],
      trim: true,
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Please provide nightly price'],
      min: [1, 'Price per night must be greater than zero'],
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'],
        message: '{VALUE} is not a valid room status',
      },
      default: 'AVAILABLE',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active rooms belonging to a property
roomSchema.index({ property: 1, status: 1 });

export const Room = mongoose.model('Room', roomSchema);
export default Room;
