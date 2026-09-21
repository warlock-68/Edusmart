const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const requireRole = require('../middleware/role');

const router = express.Router();

// POST /api/bookings - student requests a session with a tutor
router.post('/', verifyToken, requireRole('student'), async (req, res) => {
  const { tutor_id, topic_id, requested_time } = req.body;
  if (!tutor_id || !topic_id || !requested_time) {
    return res.status(400).json({ error: 'tutor_id, topic_id, and requested_time are all required' });
  }

  try {
    const [[tutor]] = await pool.query('SELECT id FROM users WHERE id = ? AND role = "tutor"', [tutor_id]);
    if (!tutor) {
      return res.status(400).json({ error: 'Selected tutor does not exist' });
    }

    const [result] = await pool.query(
      `INSERT INTO bookings (student_id, tutor_id, topic_id, requested_time, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, tutor_id, topic_id, requested_time]
    );

    res.status(201).json({ message: 'Booking request sent', bookingId: result.insertId });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Could not create booking request' });
  }
});

// GET /api/bookings/mine - student views their own booking requests
router.get('/mine', verifyToken, requireRole('student'), async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.id, b.requested_time, b.suggested_time, b.status, b.created_at,
              u.name AS tutor_name, ct.grade, ct.topic
       FROM bookings b
       JOIN users u ON u.id = b.tutor_id
       JOIN curriculum_topics ct ON ct.id = b.topic_id
       WHERE b.student_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching student bookings:', err);
    res.status(500).json({ error: 'Could not load your bookings' });
  }
});

// GET /api/bookings/incoming - tutor views requests sent to them
router.get('/incoming', verifyToken, requireRole('tutor'), async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.id, b.requested_time, b.suggested_time, b.status, b.created_at,
              u.name AS student_name, ct.grade, ct.topic
       FROM bookings b
       JOIN users u ON u.id = b.student_id
       JOIN curriculum_topics ct ON ct.id = b.topic_id
       WHERE b.tutor_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching incoming bookings:', err);
    res.status(500).json({ error: 'Could not load incoming requests' });
  }
});

// PUT /api/bookings/:id/respond - tutor accepts, declines, or suggests a new time
router.put('/:id/respond', verifyToken, requireRole('tutor'), async (req, res) => {
  const { action, suggested_time } = req.body; // action: 'accept' | 'decline' | 'suggest'
  const validActions = ['accept', 'decline', 'suggest'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ error: 'action must be accept, decline, or suggest' });
  }
  if (action === 'suggest' && !suggested_time) {
    return res.status(400).json({ error: 'suggested_time is required when suggesting a new time' });
  }

  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking || booking.tutor_id !== req.user.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'This booking has already been responded to' });
    }

    if (action === 'accept') {
      await pool.query('UPDATE bookings SET status = "accepted" WHERE id = ?', [booking.id]);
    } else if (action === 'decline') {
      await pool.query('UPDATE bookings SET status = "declined" WHERE id = ?', [booking.id]);
    } else {
      await pool.query('UPDATE bookings SET suggested_time = ? WHERE id = ?', [suggested_time, booking.id]);
    }

    res.json({ message: 'Response recorded' });
  } catch (err) {
    console.error('Error responding to booking:', err);
    res.status(500).json({ error: 'Could not respond to booking' });
  }
});

// PUT /api/bookings/:id/respond-suggestion - student accepts or declines the tutor's suggested time
router.put('/:id/respond-suggestion', verifyToken, requireRole('student'), async (req, res) => {
  const { accept } = req.body; // boolean
  if (typeof accept !== 'boolean') {
    return res.status(400).json({ error: 'accept (true/false) is required' });
  }

  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking || booking.student_id !== req.user.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (!booking.suggested_time) {
      return res.status(400).json({ error: 'This booking has no suggested time to respond to' });
    }

    if (accept) {
      await pool.query(
        'UPDATE bookings SET requested_time = suggested_time, suggested_time = NULL, status = "accepted" WHERE id = ?',
        [booking.id]
      );
    } else {
      await pool.query('UPDATE bookings SET status = "declined" WHERE id = ?', [booking.id]);
    }

    res.json({ message: 'Response recorded' });
  } catch (err) {
    console.error('Error responding to suggested time:', err);
    res.status(500).json({ error: 'Could not respond to suggested time' });
  }
});

// POST /api/bookings/:id/rate - student rates a completed session
router.post('/:id/rate', verifyToken, requireRole('student'), async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be a number between 1 and 5' });
  }

  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking || booking.student_id !== req.user.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted bookings can be rated' });
    }

    await pool.query(
      'INSERT INTO tutor_ratings (booking_id, student_id, tutor_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [booking.id, req.user.id, booking.tutor_id, rating, comment || null]
    );

    res.status(201).json({ message: 'Rating submitted' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'You have already rated this session' });
    }
    console.error('Error submitting rating:', err);
    res.status(500).json({ error: 'Could not submit rating' });
  }
});

module.exports = router;