import mongoose from 'mongoose';
import Property from '../models/Property.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';

/**
 * GET /api/properties
 * Public endpoint to explore active properties with city, price, search filters, and pagination.
 */
export const getPublicProperties = async (req, res, next) => {
  try {
    const {
      search,
      city,
      minPrice,
      maxPrice,
      amenities,
      page = 1,
      limit = 10,
    } = req.query;

    const query = { status: 'ACTIVE' };

    // Search query on name, city, or state
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { 'location.city': searchRegex },
        { 'location.state': searchRegex },
        { tagline: searchRegex },
      ];
    }

    // Specific city filter
    if (city && city !== 'All Cities') {
      query['location.city'] = new RegExp(`^${city.trim()}$`, 'i');
    }

    // Price range filters
    if (minPrice || maxPrice) {
      query.startingPrice = {};
      if (minPrice) query.startingPrice.$gte = Number(minPrice);
      if (maxPrice) query.startingPrice.$lte = Number(maxPrice);
    }

    // Amenities filter
    if (amenities) {
      const amenitiesList = Array.isArray(amenities)
        ? amenities
        : amenities.split(',').map((a) => a.trim());
      if (amenitiesList.length > 0) {
        query.amenities = { $all: amenitiesList };
      }
    }

    // Pagination calculations
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const total = await Property.countDocuments(query);
    const properties = await Property.find(query)
      .populate('owner', 'name avatar ownerAvatarVisible')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Respect Owner Avatar Privacy: if ownerAvatarVisible === false, suppress avatar
    const sanitizedProperties = properties.map((prop) => {
      if (prop.owner) {
        if (!prop.owner.ownerAvatarVisible) {
          prop.owner.avatar = null;
        }
      }
      return prop;
    });

    res.status(200).json({
      success: true,
      count: sanitizedProperties.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: sanitizedProperties,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/properties/:id
 * Public endpoint to fetch details of a specific property.
 */
export const getPublicPropertyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format.' });
    }

    const property = await Property.findById(id)
      .populate('owner', 'name avatar ownerAvatarVisible')
      .lean();

    if (!property || property.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // Privacy filter: respect owner's visibility preference
    if (property.owner && !property.owner.ownerAvatarVisible) {
      property.owner.avatar = null;
    }

    res.status(200).json({
      success: true,
      property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/properties/owner/my-properties
 * Authenticated endpoint: Returns all properties belonging exclusively to the authenticated owner.
 */
export const getMyProperties = async (req, res, next) => {
  try {
    // Strictly filter by authenticated owner's ID from JWT
    const properties = await Property.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/properties
 * Authenticated endpoint: Creates a new hotel listing under the authenticated owner.
 */
export const createProperty = async (req, res, next) => {
  try {
    const {
      name,
      tagline,
      description,
      location,
      amenities,
      startingPrice,
      coverImage,
      images,
    } = req.body;

    // Field presence checks
    if (!name || !description || !location || !startingPrice || !coverImage) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory property fields (name, description, location, startingPrice, coverImage).',
      });
    }

    if (!location.address || !location.city || !location.state) {
      return res.status(400).json({
        success: false,
        message: 'Location must include address, city, and state.',
      });
    }

    // Always assign owner from authenticated user and enforce default status PENDING_APPROVAL
    const property = await Property.create({
      owner: req.user._id,
      name: name.trim(),
      tagline: tagline ? tagline.trim() : '',
      description: description.trim(),
      location: {
        address: location.address.trim(),
        city: location.city.trim(),
        state: location.state.trim(),
        country: location.country ? location.country.trim() : 'India',
        zipCode: location.zipCode ? location.zipCode.trim() : '',
      },
      amenities: Array.isArray(amenities) ? amenities : [],
      startingPrice: Number(startingPrice),
      coverImage,
      images: Array.isArray(images) && images.length > 0 ? images : [coverImage],
      status: 'PENDING_APPROVAL',
      rejectionReason: '',
      reviewedAt: null,
      reviewedBy: null,
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully.',
      property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/properties/:id
 * Authenticated endpoint: Updates an existing property.
 * Strictly verifies ownership; cross-owner modification is rejected with 403 Forbidden.
 */
export const updateProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format.' });
    }

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // Ownership Verification Check
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to modify properties belonging to another owner.',
      });
    }

    const {
      name,
      tagline,
      description,
      location,
      amenities,
      startingPrice,
      coverImage,
      images,
      status,
    } = req.body;

    if (name) property.name = name.trim();
    if (tagline !== undefined) property.tagline = tagline.trim();
    if (description) property.description = description.trim();
    if (location) {
      if (location.address) property.location.address = location.address.trim();
      if (location.city) property.location.city = location.city.trim();
      if (location.state) property.location.state = location.state.trim();
      if (location.country) property.location.country = location.country.trim();
      if (location.zipCode !== undefined) property.location.zipCode = location.zipCode.trim();
    }
    if (amenities !== undefined) property.amenities = Array.isArray(amenities) ? amenities : [];
    if (startingPrice !== undefined) property.startingPrice = Number(startingPrice);
    if (coverImage) property.coverImage = coverImage;
    if (images !== undefined) property.images = Array.isArray(images) ? images : [];

    // Ownership & Moderation Safety Guard:
    // Property owners CANNOT self-approve listings. Only Platform Admin can approve (status: 'ACTIVE').
    if (status) {
      if (status === 'ACTIVE' && ['PENDING_APPROVAL', 'REJECTED'].includes(property.status)) {
        return res.status(400).json({
          success: false,
          message: 'Property owners cannot self-approve listings. Platform Administrator approval is required.',
        });
      }

      if (['ACTIVE', 'INACTIVE'].includes(status)) {
        if (['ACTIVE', 'INACTIVE'].includes(property.status)) {
          property.status = status;
        } else {
          return res.status(400).json({
            success: false,
            message: `Cannot toggle status to ${status} while property is ${property.status}.`,
          });
        }
      } else if (status === 'PENDING_APPROVAL' && property.status === 'REJECTED') {
        // Owner resubmitting rejected property
        property.status = 'PENDING_APPROVAL';
        property.rejectionReason = '';
      } else if (status !== property.status) {
        return res.status(400).json({
          success: false,
          message: 'Invalid property status transition.',
        });
      }
    }

    // If an owner modifies details of a previously REJECTED property without explicit status,
    // automatically reset to PENDING_APPROVAL and clear rejection feedback for admin re-review
    if (property.status === 'REJECTED' && !status) {
      property.status = 'PENDING_APPROVAL';
      property.rejectionReason = '';
    }

    await property.save();

    res.status(200).json({
      success: true,
      message: 'Property updated successfully.',
      property,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/properties/:id
 * Authenticated endpoint: Safely deletes or deactivates a property.
 * Verifies that no active bookings exist before deletion.
 */
export const deleteProperty = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format.' });
    }

    const property = await Property.findById(id);

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // Ownership Verification Check
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You are not authorized to delete properties belonging to another owner.',
      });
    }

    // Safety check: Prevent deletion if active confirmed bookings exist
    const activeBookingsCount = await Booking.countDocuments({
      property: id,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    });

    if (activeBookingsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete property with ${activeBookingsCount} active reservation(s). Please deactivate the listing instead.`,
      });
    }

    // Safe deletion: remove associated rooms first
    await Room.deleteMany({ property: id });
    await Property.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Property and associated rooms deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
