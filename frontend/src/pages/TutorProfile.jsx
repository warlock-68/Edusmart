import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import TutorAvatar from './TutorAvatar';

function authHeader() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

function getRole() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.role || null;
  } catch {
    return null;
  }
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function TutorProfile() {
  const { id } = useParams();
  const isStudent = getRole() === 'student';

  const [tutor, setTutor] = useState(null);
  const [extra, setExtra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [topicId, setTopicId] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([
      api.get(`/tutors/${id}`, authHeader()),
      api.get(`/profile/public/${id}`, authHeader())
    ])
      .then(([a, b]) => {
        setTutor(a.data);
        setExtra(b.data);
      })
      .catch(() => setError('Could not load this tutor'))
      .finally(() => setLoading(false));
  }, [id]);

  const download = async (material) => {
    setMessage('');
    setDownloadingId(material.id);
    try {
      const res = await api.get(`/profile/materials/${material.id}/download`, {
        ...authHeader(),
        responseType: 'blob'
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${material.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMessage(`Could not download "${material.title}". Please try again.`);
      setMessageType('error');
    } finally {
      setDownloadingId(null);
    }
  };

  const sendRequest = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!topicId || !requestedTime) {
      setMessage('Please select a topic and a preferred time.');
      setMessageType('error');
      return;
    }
    try {
      await api.post('/bookings', {
        tutor_id: tutor.id,
        topic_id: topicId,
        requested_time: requestedTime
      }, authHeader());
      setMessage('Booking request sent!');
      setMessageType('success');
      setShowForm(false);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not send booking request');
      setMessageType('error');
    }
  };

  if (loading) {
    return <div className="page-shell--wide"><div className="panel"><p>Loading tutor...</p></div></div>;
  }

  if (error || !tutor) {
    return (
      <div className="page-shell--wide">
        <div className="panel">
          <p className="badge-error mb-4">{error || 'Tutor not found'}</p>
          <Link to="/tutors" className="btn-secondary">Back to tutors</Link>
        </div>
      </div>
    );
  }

  const p = extra?.profile || {};
  const materials = extra?.materials || [];

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <Link to="/tutors" className="mb-4" style={{ display: 'inline-block' }}>← Back to tutors</Link>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center', marginBottom: 24 }}>
          <TutorAvatar id={tutor.id} name={tutor.name} hasPhoto={extra?.has_photo} size={140} />
          <div style={{ flex: '1 1 260px' }}>
            <h2 className="text-2xl mb-1">{tutor.name}</h2>
            {p.headline && <p className="mb-1">{p.headline}</p>}
            <p className="mb-1">
              {tutor.avg_rating ? `★ ${tutor.avg_rating} (${tutor.rating_count} reviews)` : 'No reviews yet'}
            </p>
            <p className="mb-3">Available: {tutor.availability_note || 'Not specified'}</p>
            {isStudent && (
              <button onClick={() => { setShowForm(!showForm); setMessage(''); }} className="btn-secondary">
                {showForm ? 'Cancel' : 'Request a Session'}
              </button>
            )}
          </div>
        </div>

        {message && (
          <p className={`mb-4 ${messageType === 'error' ? 'badge-error' : 'badge-success'}`}>{message}</p>
        )}

        {showForm && (
          <form onSubmit={sendRequest} className="mb-6 border-t border-[var(--color-line)] pt-4">
            <label className="field-label">Topic</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="field-input">
              <option value="">-- Select Topic --</option>
              {tutor.topics.map((t) => (
                <option key={t.id} value={t.id}>{t.grade}: {t.topic}</option>
              ))}
            </select>

            <label className="field-label">Preferred Date &amp; Time</label>
            <input
              type="datetime-local"
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
              className="field-input"
            />

            <button type="submit" className="btn-primary">Send Request</button>
          </form>
        )}

        {p.bio && (
          <div className="mb-6">
            <h3 className="text-lg mb-2">About</h3>
            <p style={{ whiteSpace: 'pre-line' }}>{p.bio}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg mb-2">Details</h3>
          {p.experience_years !== null && p.experience_years !== undefined && (
            <p>Experience: {p.experience_years} years</p>
          )}
          {p.education && <p>Education: {p.education}</p>}
          {p.languages && <p>Languages: {p.languages}</p>}
        </div>

        <div className="mb-6">
          <h3 className="text-lg mb-2">Topics taught</h3>
          {tutor.topics.length === 0 ? (
            <p>None listed yet.</p>
          ) : (
            <ul>
              {tutor.topics.map((t) => (
                <li key={t.id} className="ml-6 list-disc">{t.grade}: {t.topic}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-lg mb-2">Notes and materials from {tutor.name}</h3>
          {materials.length === 0 ? (
            <p>No materials uploaded yet.</p>
          ) : (
            materials.map((m) => (
              <div
                key={m.id}
                className="py-3 border-b border-[var(--color-line)] flex items-center justify-between flex-wrap gap-2"
              >
                <div>
                  <span className="font-medium">{m.title}</span>
                  <span className="text-[var(--color-ink)]/60">
                    {' '}({m.topic ? `${m.grade}: ${m.topic}, ` : ''}{formatSize(m.file_size)})
                  </span>
                </div>
                <button
                  onClick={() => download(m)}
                  disabled={downloadingId === m.id}
                  className="btn-secondary"
                >
                  {downloadingId === m.id ? 'Downloading...' : 'Download'}
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <h3 className="text-lg mb-2">Reviews</h3>
          {tutor.reviews.length === 0 ? (
            <p>No reviews yet.</p>
          ) : (
            tutor.reviews.map((r, i) => (
              <div key={i} className="py-2 border-b border-[var(--color-line)]">
                <p>★ {r.rating} — {r.student_name}</p>
                {r.comment && <p>{r.comment}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TutorProfile;