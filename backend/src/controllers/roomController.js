import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Property from '../models/Property.js';
import Booking from '../models/Booking.js';

/**
 * GET /api/properties/:propertyId/rooms
 * Lists rooms for a given property.
 */
export const getRoomsByProperty = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format.' });
    }

    const property = await Property.findById(propertyId);
    if (!property || property.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    const rooms = await Room.find({ property: propertyId })
      .sort({ pricePerNight: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rooms/:id
 * Fetches single room details.
 */
export const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID format.' });
    }

    const room = await Room.findById(id).populate('property', 'name location coverImage startingPrice');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    res.status(200).json({
      success: true,
      room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/rooms/owner/my-rooms
 * Lists all rooms belonging to any property owned by the authenticated owner.
 */
export const getMyRooms = async (req, res, next) => {
  try {
    // 1. Find all properties belonging to the authenticated owner
    const myProperties = await Property.find({ owner: req.user._id }).select('_id name');
    const propertyIds = myProperties.map((p) => p._id);

    // 2. Find all rooms linked to these properties
    const rooms = await Room.find({ property: { $in: propertyIds } })
      .populate('property', 'name location.city')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: rooms.length,
      rooms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/properties/:propertyId/rooms
 * Creates a room under the specified property.
 * Strictly verifies that the authenticated owner owns the property.
 */
export const createRoom = async (req, res, next) => {
  try {
    const { propertyId } = req.params;

    if (!mongoose.isValidObjectId(propertyId)) {
      return res.status(400).json({ success: false, message: 'Invalid property ID format.' });
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found.' });
    }

    // Ownership check: Prevent creating rooms under another owner's property
    if (property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot add rooms to a property you do not own.',
      });
    }

    const {
      roomType,
      description,
      capacity,
      bedType,
      pricePerNight,
      amenities,
      images,
      status,
    } = req.body;

    if (!roomType || !capacity || !bedType || !pricePerNight) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all mandatory room fields (roomType, capacity, bedType, pricePerNight).',
      });
    }

    if (Number(capacity) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Room capacity must accommodate at least 1 guest.',
      });
    }

    if (Number(pricePerNight) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Nightly price must be greater than zero.',
      });
    }

    const room = await Room.create({
      property: propertyId,
      roomType: roomType.trim(),
      description: description ? description.trim() : '',
      capacity: Number(capacity),
      bedType: bedType.trim(),
      pricePerNight: Number(pricePerNight),
      amenities: Array.isArray(amenities) ? amenities : [],
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80'],
      status: status || 'AVAILABLE',
    });

    res.status(201).json({
      success: true,
      message: 'Room added to property successfully.',
      room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/rooms/:id
 * Updates an existing room.
 * Strictly verifies ownership via the associated property.
 */
export const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID format.' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const property = await Property.findById(room.property);
    if (!property || property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own the property associated with this room.',
      });
    }

    const {
      roomType,
      description,
      capacity,
      bedType,
      pricePerNight,
      amenities,
      images,
      status,
    } = req.body;

    if (roomType) room.roomType = roomType.trim();
    if (description !== undefined) room.description = description.trim();
    if (capacity !== undefined) {
      if (Number(capacity) < 1) {
        return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
      }
      room.capacity = Number(capacity);
    }
    if (bedType) room.bedType = bedType.trim();
    if (pricePerNight !== undefined) {
      if (Number(pricePerNight) <= 0) {
        return res.status(400).json({ success: false, message: 'Price per night must be positive.' });
      }
      room.pricePerNight = Number(pricePerNight);
    }
    if (amenities !== undefined) room.amenities = Array.isArray(amenities) ? amenities : [];
    if (images !== undefined) room.images = Array.isArray(images) ? images : [];
    if (status && ['AVAILABLE', 'MAINTENANCE', 'UNAVAILABLE'].includes(status)) {
      room.status = status;
    }

    await room.save();

    res.status(200).json({
      success: true,
      message: 'Room updated successfully.',
      room,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/rooms/:id
 * Safely deactivates or removes a room.
 * Prevents accidental cascading loss of existing booking records.
 */
export const deleteOrDeactivateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid room ID format.' });
    }

    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const property = await Property.findById(room.property);
    if (!property || property.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own the property associated with this room.',
      });
    }

    // Check for active reservations
    const activeBookingsCount = await Booking.countDocuments({
      room: id,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    });

    if (activeBookingsCount > 0) {
      // Deactivate instead of deleting to preserve booking history integrity
      room.status = 'UNAVAILABLE';
      await room.save();

      return res.status(200).json({
        success: true,
        message: `Room has ${activeBookingsCount} active reservation(s). It has been safely deactivated instead of deleted to protect booking history.`,
        room,
      });
    }

    await Room.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Room deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
