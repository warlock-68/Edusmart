import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import TutorAvatar from './TutorAvatar';

function Tutors() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [topicId, setTopicId] = useState('');
  const [requestedTime, setRequestedTime] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    api.get('/tutors', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setTutors(res.data))
      .catch(() => setError('Could not load tutors'))
      .finally(() => setLoading(false));
  }, []);

  const openBookingForm = (tutor) => {
    setSelectedTutor(tutor);
    setTopicId('');
    setRequestedTime('');
    setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!topicId || !requestedTime) {
      setMessage('Please select a topic and a preferred time.');
      setMessageType('error');
      return;
    }
    const token = localStorage.getItem('token');
    try {
      await api.post('/bookings', {
        tutor_id: selectedTutor.id,
        topic_id: topicId,
        requested_time: requestedTime,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMessage('Booking request sent!');
      setMessageType('success');
      setSelectedTutor(null);
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not send booking request');
      setMessageType('error');
    }
  };

  // Every topic that at least one tutor teaches, for the filter box
  const allTopics = [];
  tutors.forEach((t) => t.topics.forEach((topic) => {
    if (!allTopics.some((x) => x.id === topic.id)) allTopics.push(topic);
  }));

  const q = search.trim().toLowerCase();
  const shown = tutors.filter((t) => {
    const nameOk = !q || t.name.toLowerCase().includes(q);
    const topicOk = !topicFilter || t.topics.some((x) => String(x.id) === topicFilter);
    return nameOk && topicOk;
  });

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Find a Tutor</h2>

        {!loading && !error && tutors.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tutor name"
              className="field-input"
              style={{ flex: '2 1 240px' }}
            />
            <select
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="field-input"
              style={{ flex: '1 1 220px' }}
            >
              <option value="">All topics</option>
              {allTopics.map((t) => (
                <option key={t.id} value={t.id}>{t.grade}: {t.topic}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <p>Loading tutors...</p>
        ) : error ? (
          <p className="badge-error">{error}</p>
        ) : tutors.length === 0 ? (
          <p>No tutors are available yet.</p>
        ) : shown.length === 0 ? (
          <p>No tutors match your search.</p>
        ) : (
          shown.map((tutor) => (
            <div key={tutor.id} className="border border-[var(--color-line)] rounded-sm p-4 mb-4">
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <TutorAvatar id={tutor.id} name={tutor.name} hasPhoto={Number(tutor.has_photo) > 0} size={80} />
                <div style={{ flex: '1 1 240px' }}>
                  <p className="font-medium mb-1">{tutor.name}</p>
                  {tutor.headline && <p className="mb-1">{tutor.headline}</p>}
                  <p className="text-[var(--color-ink)]/70 mb-1">
                    {tutor.avg_rating ? `★ ${tutor.avg_rating} (${tutor.rating_count} reviews)` : 'No reviews yet'}
                  </p>
                  <p className="text-[var(--color-ink)]/70 mb-1">
                    Available: {tutor.availability_note || 'Not specified'}
                  </p>
                  <p className="text-[var(--color-ink)]/70 mb-3">
                    Topics: {tutor.topics.length > 0 ? tutor.topics.map(t => `${t.grade}: ${t.topic}`).join(', ') : 'None listed yet'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Link to={`/tutors/${tutor.id}`} className="btn-secondary">View profile</Link>
                    <button onClick={() => openBookingForm(tutor)} className="btn-secondary">
                      Request a Session
                    </button>
                  </div>
                </div>
              </div>

              {selectedTutor?.id === tutor.id && (
                <form onSubmit={handleSubmit} className="mt-4 border-t border-[var(--color-line)] pt-4">
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
            </div>
          ))
        )}

        {message && (
          <p className={`mt-4 ${messageType === 'error' ? 'badge-error' : 'badge-success'}`}>{message}</p>
        )}
      </div>
    </div>
  );
}

export default Tutors;