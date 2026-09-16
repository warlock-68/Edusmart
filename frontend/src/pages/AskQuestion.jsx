import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

function AskQuestion() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAnswer(null);

    if (!question.trim()) {
      setError('Please enter a question.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await api.post(
        '/query',
        { question: question.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnswer(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const matchedCurriculumTopic = Boolean(answer && answer.topic_id);

    return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Ask a Chemistry Question</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            placeholder="e.g. What is an alkane?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            rows={3}
            className="field-input"
          />
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>

        {error && <p className="badge-error mt-4">{error}</p>}

        {answer && (
          <div className="mt-8 border border-[var(--color-line)] rounded-sm p-6">
            {!matchedCurriculumTopic && (
              <p className="italic text-[var(--color-ink)]/60 mb-4">
                This question doesn't match a specific curriculum topic, so no revision quiz is available for it.
              </p>
            )}
            {matchedCurriculumTopic && (
              <>
                <p className="mb-2"><span className="field-label inline">Grade:</span> {answer.grade}</p>
                <p className="mb-4"><span className="field-label inline">Topic:</span> {answer.matched_topic}</p>
              </>
            )}
            <p className="mb-4"><span className="field-label inline">Explanation:</span> {answer.explanation}</p>
            <p className="mb-4"><span className="field-label inline">Example:</span> {answer.example}</p>
            <p className="mb-4"><span className="field-label inline">Practice Question:</span> {answer.practice_question}</p>
            {matchedCurriculumTopic && (
              <button
                onClick={() => navigate(`/quiz?topic_id=${answer.topic_id}`)}
                className="btn-secondary mt-2 w-full"
              >
                Would you like to attempt some revision questions on this topic?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AskQuestion;
