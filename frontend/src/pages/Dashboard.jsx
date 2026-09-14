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

  if (error) return <p style={{ textAlign: 'center', color: 'red' }}>{error}</p>;
  if (!data) return <p style={{ textAlign: 'center' }}>Loading dashboard...</p>;

  return (
    <div style={{ maxWidth: 800, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Analytics Dashboard</h2>

      <h3>Content Downloads</h3>
      {data.downloads.length === 0 ? <p>No downloads yet.</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
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

      <h3>Topic Engagement (Questions Asked)</h3>
      {data.topicEngagement.length === 0 ? <p>No questions asked yet.</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 30 }}>
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

      <h3>Quiz Performance (Lowest Average First)</h3>
      {data.quizPerformance.length === 0 ? <p>No quiz attempts yet.</p> : (
        <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th>Grade</th><th>Topic</th><th>Attempts</th><th>Avg Score</th></tr>
          </thead>
          <tbody>
            {data.quizPerformance.map((q, i) => {
              const avg = Number(q.avg_score);
              return (
                <tr key={i}>
                  <td>{q.grade}</td>
                  <td>{q.topic}</td>
                  <td>{q.attempts}</td>
                  <td>{Number.isFinite(avg) ? avg.toFixed(1) : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;
