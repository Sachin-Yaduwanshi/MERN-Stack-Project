import { verifyTokenPayload } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Middleware: verifyToken
 * Validates the Authorization Bearer header, decodes the JWT, verifies user existence
 * in the database, and asserts that the account is active.
 */
export const verifyToken = async (req, res, next) => {
  try {
    let token;

    // Extract Bearer token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No authorization token provided.',
      });
    }

    // Verify token validity
    let decoded;
    try {
      decoded = verifyTokenPayload(token);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authorization token.',
      });
    }

    // Fetch user from database to ensure fresh state and active account status
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User record no longer exists.',
      });
    }

    // Check account status: suspended users cannot access protected endpoints
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact platform support.',
      });
    }

    // Attach validated user to request object
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: authorizeRoles
 * Enforces role-based access control. Only users possessing one of the permitted roles
 * may proceed. Never relies on client-supplied role parameters.
 *
 * @param  {...string} roles - Permitted roles (GUEST, PROPERTY_OWNER, PLATFORM_ADMIN)
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};
