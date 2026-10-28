import express from 'express';
import {
  getPublicProperties,
  getPublicPropertyById,
  getMyProperties,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../controllers/propertyController.js';
import {
  getRoomsByProperty,
  createRoom,
} from '../controllers/roomController.js';
import { verifyToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Public Property Discovery Endpoints
router.get('/', getPublicProperties);
router.get('/owner/my-properties', verifyToken, authorizeRoles('PROPERTY_OWNER'), getMyProperties);
router.get('/:id', getPublicPropertyById);

// Nested Room Endpoints on Property
router.get('/:propertyId/rooms', getRoomsByProperty);
router.post('/:propertyId/rooms', verifyToken, authorizeRoles('PROPERTY_OWNER'), createRoom);

// Authenticated Property Owner Management Endpoints
router.post('/', verifyToken, authorizeRoles('PROPERTY_OWNER'), createProperty);
router.put('/:id', verifyToken, authorizeRoles('PROPERTY_OWNER'), updateProperty);
router.delete('/:id', verifyToken, authorizeRoles('PROPERTY_OWNER'), deleteProperty);

export default router;
