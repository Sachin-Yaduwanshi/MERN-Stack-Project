import express from 'express';
import {
  getRoomsByProperty,
  getRoomById,
  getMyRooms,
  createRoom,
  updateRoom,
  deleteOrDeactivateRoom,
} from '../controllers/roomController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Public Room Endpoints
router.get('/owner/my-rooms', verifyToken, authorizeRoles('PROPERTY_OWNER'), getMyRooms);
router.get('/:id', getRoomById);

// Authenticated Property Owner Endpoints
router.put('/:id', verifyToken, authorizeRoles('PROPERTY_OWNER'), updateRoom);
router.delete('/:id', verifyToken, authorizeRoles('PROPERTY_OWNER'), deleteOrDeactivateRoom);

export default router;
