const express = require('express');
const pool = require('../db');
const verifyToken = require('../middleware/auth');
const { generateQuiz, LLMServiceError } = require('../llmService');

const router = express.Router();

// POST /api/quiz/generate - create a new quiz for a topic
router.post('/generate', verifyToken, async (req, res) => {
  const { topic_id } = req.body;

  if (!topic_id || isNaN(Number(topic_id))) {
    return res.status(400).json({ error: 'A valid topic_id is required' });
  }

  try {
    const [topicRows] = await pool.query('SELECT * FROM curriculum_topics WHERE id = ?', [topic_id]);
    if (topicRows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    const topicName = topicRows[0].topic;

    let quizData;
    try {
      quizData = await generateQuiz(topicName, 3);
    } catch (err) {
      if (err instanceof LLMServiceError) {
        console.error('LLM service error:', err.message, err.cause || '');
        return res.status(503).json({ error: err.message });
      }
      throw err;
    }

    // Insert quiz + all questions atomically - if any question insert fails,
    // roll back so we never leave a quiz with a partial question set.
    const connection = await pool.getConnection();
    let quizId;
    try {
      await connection.beginTransaction();

      const [quizResult] = await connection.query(
        'INSERT INTO quizzes (topic_id, title) VALUES (?, ?)',
        [topic_id, `Quiz: ${topicName}`]
      );
      quizId = quizResult.insertId;

      for (const q of quizData.questions) {
        await connection.query(
          `INSERT INTO quiz_questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_option)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quizId, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    const [questions] = await pool.query(
      'SELECT id, question_text, option_a, option_b, option_c, option_d FROM quiz_questions WHERE quiz_id = ?',
      [quizId]
    );

    res.status(201).json({ quizId, title: `Quiz: ${topicName}`, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/quiz/:id/submit - submit answers and get a score
router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const quizId = req.params.id;
    const { answers } = req.body;

    if (isNaN(Number(quizId))) {
      return res.status(400).json({ error: 'Invalid quiz id' });
    }
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers object is required' });
    }

    const [questions] = await pool.query(
      'SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option FROM quiz_questions WHERE quiz_id = ?',
      [quizId]
    );

    if (questions.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    let score = 0;
    const review = questions.map((q) => {
      const studentAnswer = answers[q.id] || null;
      const isCorrect = studentAnswer === q.correct_option;
      if (isCorrect) score++;
      return {
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: q.correct_option,
        student_answer: studentAnswer,
        is_correct: isCorrect
      };
    });

    await pool.query(
      'INSERT INTO quiz_attempts (quiz_id, student_id, score) VALUES (?, ?, ?)',
      [quizId, req.user.id, score]
    );

    res.json({ score, total: questions.length, review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;