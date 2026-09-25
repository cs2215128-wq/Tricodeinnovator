import jwt from 'jsonwebtoken';
import { query } from '../db/database.js';

/**
 * JWT Authentication Middleware
 * Verifies Bearer token and attaches user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required. Include "Bearer <token>" in the Authorization header.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token has expired. Please log in again.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.' });
    }

    // Verify user still exists in database
    const result = await query(
      'SELECT id, email, full_name FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User account no longer exists.' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    return res.status(500).json({ success: false, message: 'Authentication service error.' });
  }
};

/**
 * Generate a signed JWT token for a user
 */
export const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
