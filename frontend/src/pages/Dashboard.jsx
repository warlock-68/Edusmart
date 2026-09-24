import { useState, useEffect } from 'react';
import api from '../api';

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    api.get('/dashboard/overview', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setData(res.data))
      .catch(err => setError(err.response?.data?.error || 'Could not load dashboard'));
  }, []);

  if (error) return <div className="page-shell"><p className="badge-error text-center">{error}</p></div>;
  if (!data) return <div className="page-shell"><p className="text-center">Loading dashboard...</p></div>;

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Analytics Dashboard</h2>

        <h3 className="text-lg mb-3">Content Downloads</h3>
        {data.downloads.length === 0 ? <p className="mb-8">No downloads yet.</p> : (
          <table className="data-table mb-8">
            <thead>
              <tr><th>Title</th><th>Topic</th><th>Downloads</th></tr>
            </thead>
            <tbody>
              {data.downloads.map((d, i) => (
                <tr key={i}><td>{d.title}</td><td>{d.topic || '—'}</td><td>{d.download_count ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="text-lg mb-3">Topic Engagement (Questions Asked)</h3>
        {data.topicEngagement.length === 0 ? <p className="mb-8">No questions asked yet.</p> : (
          <table className="data-table mb-8">
            <thead>
              <tr><th>Grade</th><th>Topic</th><th>Questions Asked</th></tr>
            </thead>
            <tbody>
              {data.topicEngagement.map((t, i) => (
                <tr key={i}><td>{t.grade}</td><td>{t.topic}</td><td>{t.questions_asked ?? 0}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 className="text-lg mb-3">Quiz Performance (Lowest Average First)</h3>
        {data.quizPerformance.length === 0 ? <p>No quiz attempts yet.</p> : (
          <table className="data-table">
            <thead>
              <tr><th>Grade</th><th>Topic</th><th>Attempts</th><th>Avg Score</th></tr>
            </thead>
            <tbody>
                            {data.quizPerformance.map((q, i) => {
                const avg = Number(q.avg_percentage);
                return (
                  <tr key={i}>
                    <td>{q.grade}</td>
                    <td>{q.topic}</td>
                    <td>{q.attempts}</td>
                    <td>{Number.isFinite(avg) ? `${Math.round(avg)}%` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Dashboard;                                         