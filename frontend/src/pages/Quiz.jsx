import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';

function Quiz() {
  const [topicId, setTopicId] = useState('');
  const [topics, setTopics] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    api.get('/content/topics', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTopics(res.data))
      .catch(() => {});
  }, []);

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
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Chemistry Quiz</h2>

        {!quiz && (
          <form onSubmit={handleGenerate}>
            <label className="field-label">Topic</label>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              required
              className="field-input"
            >
              <option value="">-- Select a topic --</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.grade}: {t.topic}</option>
              ))}
            </select>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Generating...' : 'Generate Quiz'}
            </button>
          </form>
        )}

        {error && <p className="badge-error mt-4">{error}</p>}

        {quiz && !result && (
          <div className="mt-6">
            <h3 className="text-lg mb-4">{quiz.title}</h3>

            {quiz.questions.length === 0 ? (
              <p>This quiz has no questions. Please try generating it again.</p>
            ) : (
              <>
                {quiz.questions.map((q, idx) => (
                  <div key={q.id} className="mb-5 border border-[var(--color-line)] rounded-sm p-4">
                    <p className="font-medium mb-2">{idx + 1}. {q.question_text}</p>
                    {['a', 'b', 'c', 'd'].map((letter) => (
                      <label key={letter} className="flex items-center gap-2 mb-1.5">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={letter.toUpperCase()}
                          checked={answers[q.id] === letter.toUpperCase()}
                          onChange={() => handleAnswerChange(q.id, letter.toUpperCase())}
                          className="accent-[var(--color-bunsen)]"
                        />
                        {q[`option_${letter}`]}
                      </label>
                    ))}
                  </div>
                ))}
                <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Submitting...' : 'Submit Quiz'}
                </button>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="mt-6">
            <div className="p-5 border-t-4 border-[var(--color-copper)] bg-white mb-6">
              <h3 className="text-lg">Score: {result.score} / {result.total}</h3>
            </div>
            <h3 className="text-lg mb-4">Review Answers</h3>
            {result.review.map((q, idx) => (
              <div
                key={q.id}
                className={`mb-4 border rounded-sm p-4 ${
                  q.is_correct
                    ? 'border-[var(--color-copper)]/40 bg-[var(--color-copper)]/5'
                    : 'border-[var(--color-cinnabar)]/40 bg-[var(--color-cinnabar)]/5'
                }`}
              >
                <p className="font-medium mb-2">{idx + 1}. {q.question_text}</p>
                <p className="mb-1">
                  Your answer: {q.student_answer ? `${q.student_answer} — ${q[`option_${q.student_answer.toLowerCase()}`]}` : 'No answer'}{' '}
                  <span className={q.is_correct ? 'badge-success' : 'badge-error'}>
                    {q.is_correct ? '✅' : '❌'}
                  </span>
                </p>
                {!q.is_correct && (
                  <p>Correct answer: {q.correct_option} — {q[`option_${q.correct_option.toLowerCase()}`]}</p>
                )}
              </div>
            ))}
            <button onClick={handleTakeAnother} className="btn-secondary w-full mt-2">
              Take Another Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
