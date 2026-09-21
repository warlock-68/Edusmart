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

  // Validate requested_time is a real, future date
  const parsedTime = new Date(requested_time);
  if (isNaN(parsedTime.getTime())) {
    return res.status(400).json({ error: 'requested_time must be a valid date/time' });
  }
  if (parsedTime.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'requested_time must be in the future' });
  }

  try {
    const [[tutor]] = await pool.query('SELECT id FROM users WHERE id = ? AND role = "tutor"', [tutor_id]);
    if (!tutor) {
      return res.status(400).json({ error: 'Selected tutor does not exist' });
    }

    const [[topic]] = await pool.query('SELECT id FROM curriculum_topics WHERE id = ?', [topic_id]);
    if (!topic) {
      return res.status(400).json({ error: 'Selected topic does not exist' });
    }

    // Ensure the tutor actually teaches this topic
    const [[taught]] = await pool.query(
      'SELECT 1 FROM tutor_topics WHERE tutor_id = ? AND topic_id = ?',
      [tutor_id, topic_id]
    );
    if (!taught) {
      return res.status(400).json({ error: 'This tutor does not teach the selected topic' });
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
            `SELECT b.id, b.requested_time, b.suggested_time, b.status, b.created_at, b.meeting_link,
              (b.status = 'accepted' AND b.requested_time <= NOW()) AS is_completed,
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
            `SELECT b.id, b.requested_time, b.suggested_time, b.status, b.created_at, b.meeting_link,
              (b.status = 'accepted' AND b.requested_time <= NOW()) AS is_completed,
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
  if (action === 'suggest') {
    if (!suggested_time) {
      return res.status(400).json({ error: 'suggested_time is required when suggesting a new time' });
    }
    const parsedSuggested = new Date(suggested_time);
    if (isNaN(parsedSuggested.getTime())) {
      return res.status(400).json({ error: 'suggested_time must be a valid date/time' });
    }
    if (parsedSuggested.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'suggested_time must be in the future' });
    }
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
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'This booking is no longer pending a response' });
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

// PUT /api/bookings/:id/link - tutor sets or updates the meeting link for an accepted booking
router.put('/:id/link', verifyToken, requireRole('tutor'), async (req, res) => {
  const { meeting_link } = req.body;
  if (!meeting_link || typeof meeting_link !== 'string' || meeting_link.trim().length === 0) {
    return res.status(400).json({ error: 'meeting_link is required' });
  }
  if (meeting_link.length > 500) {
    return res.status(400).json({ error: 'meeting_link is too long' });
  }

  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking || booking.tutor_id !== req.user.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Meeting link can only be added to an accepted booking' });
    }

    await pool.query('UPDATE bookings SET meeting_link = ? WHERE id = ?', [meeting_link.trim(), booking.id]);
    res.json({ message: 'Meeting link saved' });
  } catch (err) {
    console.error('Error saving meeting link:', err);
    res.status(500).json({ error: 'Could not save meeting link' });
  }
});

// POST /api/bookings/:id/rate - student rates a completed session
router.post('/:id/rate', verifyToken, requireRole('student'), async (req, res) => {
  const { rating, comment } = req.body;
  const numericRating = Number(rating);
  if (
    rating === undefined ||
    rating === null ||
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return res.status(400).json({ error: 'rating must be a whole number between 1 and 5' });
  }

  try {
    const [[booking]] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking || booking.student_id !== req.user.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }
        if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted bookings can be rated' });
    }
    if (new Date(booking.requested_time).getTime() > Date.now()) {
      return res.status(400).json({ error: 'You can only rate a session after it has taken place' });
    
    }

    await pool.query(
      'INSERT INTO tutor_ratings (booking_id, student_id, tutor_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
      [booking.id, req.user.id, booking.tutor_id, numericRating, comment || null]
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