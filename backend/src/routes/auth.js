import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { query } from '../db/database.js';
import { generateToken } from '../middleware/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Zod validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(255),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/v1/auth/register
 * Register a new user and initialize their gamification profile
 */
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { email, password, full_name } = validation.data;

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user and gamification profile in transaction
    const client = await (await import('../db/database.js')).getClient();
    try {
      await client.query('BEGIN');

      const userId = crypto.randomUUID();
      const userResult = await client.query(
        `INSERT INTO users (id, email, password_hash, full_name)
         VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, created_at`,
        [userId, email.toLowerCase(), password_hash, full_name]
      );

      const user = userResult.rows[0];

      // Initialize gamification profile
      await client.query(
        `INSERT INTO gamification_profiles (user_id) VALUES ($1)`,
        [user.id]
      );

      await client.query('COMMIT');

      const token = generateToken(user.id);

      res.status(201).json({
        success: true,
        message: 'Account created successfully! Welcome to ResearchPilot AI.',
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            created_at: user.created_at,
          },
        },
      });
    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }

    const { email, password } = validation.data;

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Fetch gamification profile
    const gamification = await query(
      'SELECT total_xp, weekly_xp, current_level, current_streak, league_tier, trees_grown FROM gamification_profiles WHERE user_id = $1',
      [user.id]
    );

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at,
        },
        gamification: gamification.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const gamification = await query(
      'SELECT total_xp, weekly_xp, current_level, current_streak, league_tier, trees_grown, updated_at FROM gamification_profiles WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        user: req.user,
        gamification: gamification.rows[0] || null,
      },
    });
  } catch (error) {
    console.error('Get me error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

export default router;
