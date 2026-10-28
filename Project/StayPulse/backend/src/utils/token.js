import jwt from 'jsonwebtoken';

/**
 * Generates a signed JSON Web Token (JWT) with user identifier and role.
 *
 * @param {string} userId - User's MongoDB ObjectId string
 * @param {string} role - User's authorized role (GUEST, PROPERTY_OWNER, PLATFORM_ADMIN)
 * @returns {string} Signed JWT string
 */
export const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'staypulse_dev_fallback_secret_38746219842';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Verifies a JWT token and decodes its payload.
 *
 * @param {string} token - Raw JWT string
 * @returns {object} Decoded token payload { id, role, iat, exp }
 */
export const verifyTokenPayload = (token) => {
  const secret = process.env.JWT_SECRET || 'staypulse_dev_fallback_secret_38746219842';
  return jwt.verify(token, secret);
};
