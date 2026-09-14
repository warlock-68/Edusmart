import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

function Quiz() {
  const [topicId, setTopicId] = useState('');
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const prefilledTopic = searchParams.get('topic_id');
    if (prefilledTopic) {
      setTopicId(prefilledTopic);
    }
  }, [searchParams]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setQuiz(null);
    setLoading(true);

    const token = localStorage.getItem('token');
    try {
      const res = await api.post(
        '/quiz/generate',
        { topic_id: topicId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuiz(res.data);
      setAnswers({});
    } catch (err) {
      setError(err.response?.data?.error || 'Could not generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleSubmit = async () => {
    setError('');

    const unanswered = quiz.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      const proceed = window.confirm(
        `You haven't answered ${unanswered.length} question${unanswered.length > 1 ? 's' : ''}. Submit anyway?`
      );
      if (!proceed) return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await api.post(
        `/quiz/${quiz.quizId}/submit`,
        { answers },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeAnother = () => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setError('');
    // topicId is left as-is so it's easy to regenerate the same topic;
    // the user can clear/change it if they want a different one.
  };

  return (
    <div style={{ maxWidth: 600, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Chemistry Quiz</h2>

      {!quiz && (
        <form onSubmit={handleGenerate}>
          <input
            type="number"
            placeholder="Topic ID (e.g. 1)"
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 10 }}>
            {loading ? 'Generating...' : 'Generate Quiz'}
          </button>
        </form>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {quiz && !result && (
        <div>
          <h3>{quiz.title}</h3>

          {quiz.questions.length === 0 ? (
            <p>This quiz has no questions. Please try generating it again.</p>
          ) : (
            <>
              {quiz.questions.map((q, idx) => (
                <div key={q.id} style={{ marginBottom: 20, border: '1px solid #ccc', borderRadius: 8, padding: 15 }}>
                  <p><strong>{idx + 1}. {q.question_text}</strong></p>
                  {['a', 'b', 'c', 'd'].map((letter) => (
                    <label key={letter} style={{ display: 'block', marginBottom: 5 }}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={letter.toUpperCase()}
                        checked={answers[q.id] === letter.toUpperCase()}
                        onChange={() => handleAnswerChange(q.id, letter.toUpperCase())}
                      />
                      {' '}{q[`option_${letter}`]}
                    </label>
                  ))}
                </div>
              ))}
              <button onClick={handleSubmit} disabled={submitting} style={{ width: '100%', padding: 10 }}>
                {submitting ? 'Submitting...' : 'Submit Quiz'}
              </button>
            </>
          )}
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ padding: 20, border: '2px solid green', borderRadius: 8, marginBottom: 20 }}>
            <h3>Score: {result.score} / {result.total}</h3>
          </div>
          <h3>Review Answers</h3>
          {result.review.map((q, idx) => (
            <div
              key={q.id}
              style={{
                marginBottom: 15,
                border: '1px solid #ccc',
                borderRadius: 8,
                padding: 15,
                backgroundColor: q.is_correct ? '#e6ffe6' : '#ffe6e6'
              }}
            >
              <p><strong>{idx + 1}. {q.question_text}</strong></p>
              <p>
                Your answer: {q.student_answer ? `${q.student_answer} — ${q[`option_${q.student_answer.toLowerCase()}`]}` : 'No answer'}{' '}
                {q.is_correct ? '✅' : '❌'}
              </p>
              {!q.is_correct && (
                <p>Correct answer: {q.correct_option} — {q[`option_${q.correct_option.toLowerCase()}`]}</p>
              )}
            </div>
          ))}
          <button onClick={handleTakeAnother} style={{ width: '100%', padding: 10, marginTop: 10 }}>
            Take Another Quiz
          </button>
        </div>
      )}
    </div>
  );
}

export default Quiz;
