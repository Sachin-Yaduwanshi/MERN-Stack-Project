import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Property must be associated with an owner'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide property name'],
      trim: true,
      minlength: [2, 'Property name must be at least 2 characters'],
      maxlength: [120, 'Property name cannot exceed 120 characters'],
      index: true,
    },
    tagline: {
      type: String,
      trim: true,
      maxlength: [200, 'Tagline cannot exceed 200 characters'],
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Please provide property description'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    location: {
      address: {
        type: String,
        required: [true, 'Please provide street address'],
        trim: true,
      },
      city: {
        type: String,
        required: [true, 'Please provide city'],
        trim: true,
        index: true,
      },
      state: {
        type: String,
        required: [true, 'Please provide state'],
        trim: true,
      },
      country: {
        type: String,
        default: 'India',
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
        default: '',
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    coverImage: {
      type: String,
      required: [true, 'Please provide a cover image for the property'],
    },
    images: {
      type: [String],
      default: [],
    },
    startingPrice: {
      type: Number,
      required: [true, 'Please provide starting price per night'],
      min: [0, 'Starting price cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: ['PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'REJECTED'],
        message: '{VALUE} is not a valid property status',
      },
      default: 'PENDING_APPROVAL',
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimized search queries
propertySchema.index({ 'location.city': 1, status: 1 });
propertySchema.index({ owner: 1, createdAt: -1 });

export const Property = mongoose.model('Property', propertySchema);
export default Property;
