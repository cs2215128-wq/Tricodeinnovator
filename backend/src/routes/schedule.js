import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { query } from '../db/database.js';

const router = express.Router();
router.use(authenticate);

// Schedule event schema
const scheduleCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  event_type: z.enum(['class', 'exam', 'assignment', 'study', 'meeting', 'other']),
  start_time: z.string().datetime({ message: 'Valid ISO datetime required for start_time' }),
  end_time: z.string().datetime({ message: 'Valid ISO datetime required for end_time' }).optional(),
  color_code: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').default('#3B82F6'),
});

const scheduleUpdateSchema = scheduleCreateSchema.partial().extend({
  title: z.string().min(1).max(255).optional(),
});

/**
 * GET /api/v1/schedule
 * Fetch all schedule events for the user (optionally filtered by date range)
 */
router.get('/', async (req, res) => {
  try {
    const { start, end, event_type } = req.query;

    let queryText = `
      SELECT id, title, event_type, start_time, end_time, color_code, created_at
      FROM academic_schedules
      WHERE user_id = $1
    `;
    const params = [req.user.id];
    let paramIndex = 2;

    if (start) {
      queryText += ` AND start_time >= $${paramIndex}`;
      params.push(start);
      paramIndex++;
    }

    if (end) {
      queryText += ` AND start_time <= $${paramIndex}`;
      params.push(end);
      paramIndex++;
    }

    if (event_type && ['class', 'exam', 'assignment', 'study', 'meeting', 'other'].includes(event_type)) {
      queryText += ` AND event_type = $${paramIndex}`;
      params.push(event_type);
      paramIndex++;
    }

    queryText += ' ORDER BY start_time ASC';

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error('Get schedule error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule.' });
  }
});

/**
 * POST /api/v1/schedule
 * Create a new academic schedule event
 */
router.post('/', async (req, res) => {
  const validation = scheduleCreateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  const { title, event_type, start_time, end_time, color_code } = validation.data;

  try {
    const result = await query(
      `INSERT INTO academic_schedules (user_id, title, event_type, start_time, end_time, color_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, event_type, start_time, end_time, color_code, created_at`,
      [req.user.id, title, event_type, start_time, end_time || null, color_code]
    );

    res.status(201).json({
      success: true,
      message: 'Schedule event created.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Create schedule error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create schedule event.' });
  }
});

/**
 * PUT /api/v1/schedule/:eventId
 * Update an existing schedule event
 */
router.put('/:eventId', async (req, res) => {
  const validation = scheduleUpdateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: validation.error.errors,
    });
  }

  const updates = validation.data;

  try {
    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(updates.title); }
    if (updates.event_type !== undefined) { fields.push(`event_type = $${paramIndex++}`); values.push(updates.event_type); }
    if (updates.start_time !== undefined) { fields.push(`start_time = $${paramIndex++}`); values.push(updates.start_time); }
    if (updates.end_time !== undefined) { fields.push(`end_time = $${paramIndex++}`); values.push(updates.end_time); }
    if (updates.color_code !== undefined) { fields.push(`color_code = $${paramIndex++}`); values.push(updates.color_code); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(req.params.eventId);
    values.push(req.user.id);

    const result = await query(
      `UPDATE academic_schedules SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING id, title, event_type, start_time, end_time, color_code`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule event not found.' });
    }

    res.json({ success: true, message: 'Schedule event updated.', data: result.rows[0] });
  } catch (error) {
    console.error('Update schedule error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update schedule event.' });
  }
});

/**
 * DELETE /api/v1/schedule/:eventId
 * Delete a schedule event
 */
router.delete('/:eventId', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM academic_schedules WHERE id = $1 AND user_id = $2 RETURNING id, title`,
      [req.params.eventId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Schedule event not found.' });
    }

    res.json({ success: true, message: `Event "${result.rows[0].title}" deleted.` });
  } catch (error) {
    console.error('Delete schedule error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to delete schedule event.' });
  }
});

export default router;
