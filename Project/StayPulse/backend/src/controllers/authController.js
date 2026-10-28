import User from '../models/User.js';
import { generateToken } from '../utils/token.js';

/**
 * Controller: Register a new account
 * Public self-registration is strictly restricted to GUEST and PROPERTY_OWNER.
 * PLATFORM_ADMIN registration attempts are rejected with 403 Forbidden.
 */
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Validate presence of required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email address, and password.',
      });
    }

    // Strict Security Rule: Reject any self-assignment of PLATFORM_ADMIN
    if (role === 'PLATFORM_ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Public self-registration as PLATFORM_ADMIN is strictly disallowed.',
      });
    }

    // Role must be either GUEST or PROPERTY_OWNER
    const targetRole = role || 'GUEST';
    if (!['GUEST', 'PROPERTY_OWNER'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified. Only 'GUEST' and 'PROPERTY_OWNER' are permitted for self-registration.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters in length.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Create user in database (password is hashed by Mongoose pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: targetRole,
      phone: phone ? phone.trim() : '',
    });

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: User Login
 * Authenticates user credentials, validates account status, and issues a JWT token.
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email address and password.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Retrieve user including the hashed password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // Verify password hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    // Check account status
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended. Please contact platform support.',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get Authenticated User Profile
 * Returns fresh user data for the current active session.
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Update Profile
 * Updates non-sensitive profile attributes for the current user.
 * Role, email, and account status changes are prevented here.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const { name, phone, avatar, ownerAvatarVisible } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    // Property Owner only: toggle public avatar visibility on hotel listings
    if (user.role === 'PROPERTY_OWNER' && ownerAvatarVisible !== undefined) {
      user.ownerAvatarVisible = Boolean(ownerAvatarVisible);
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};
