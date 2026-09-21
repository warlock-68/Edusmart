import { useState, useEffect } from 'react';
import api from '../api';

function MyBookings() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isTutor = user.role === 'tutor';

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Tutor-only: availability + topics management
  const [availabilityNote, setAvailabilityNote] = useState('');
  const [myTopics, setMyTopics] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [newTopicId, setNewTopicId] = useState('');

  // Tutor-only: suggesting a new time per booking
  const [suggestInputs, setSuggestInputs] = useState({});

  // Student-only: rating per booking
  const [ratingInputs, setRatingInputs] = useState({});

  // Tutor-only: meeting link per booking
  const [linkInputs, setLinkInputs] = useState({});

  const token = localStorage.getItem('token');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  const loadBookings = () => {
    const endpoint = isTutor ? '/bookings/incoming' : '/bookings/mine';
    api.get(endpoint, authHeader)
      .then(res => setBookings(res.data))
      .catch(() => setError('Could not load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBookings();
    if (isTutor) {
      api.get('/tutors/topics/mine', authHeader).then(res => setMyTopics(res.data)).catch(() => {});
      api.get('/content/topics', authHeader).then(res => setAllTopics(res.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetAvailability = async (e) => {
    e.preventDefault();
    if (!availabilityNote.trim()) return;
    try {
      await api.put('/tutors/availability', { availability_note: availabilityNote }, authHeader);
      setMessage('Availability updated');
      setAvailabilityNote('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not update availability');
    }
  };

  const handleAddTopic = async (e) => {
    e.preventDefault();
    if (!newTopicId) return;
    try {
      await api.post('/tutors/topics', { topic_id: newTopicId }, authHeader);
      const res = await api.get('/tutors/topics/mine', authHeader);
      setMyTopics(res.data);
      setNewTopicId('');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not add topic');
    }
  };

  const handleRemoveTopic = async (topicId) => {
    try {
      await api.delete(`/tutors/topics/${topicId}`, authHeader);
      setMyTopics(myTopics.filter(t => t.id !== topicId));
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not remove topic');
    }
  };

  const respondToBooking = async (bookingId, action) => {
    const suggested_time = suggestInputs[bookingId];
    if (action === 'suggest' && !suggested_time) {
      setMessage('Pick a time to suggest first.');
      return;
    }
    try {
      await api.put(`/bookings/${bookingId}/respond`, { action, suggested_time }, authHeader);
      setMessage('Response sent');
      loadBookings();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not respond to booking');
    }
  };

  const respondToSuggestion = async (bookingId, accept) => {
    try {
      await api.put(`/bookings/${bookingId}/respond-suggestion`, { accept }, authHeader);
      setMessage(accept ? 'New time accepted' : 'Suggested time declined');
      loadBookings();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not respond');
    }
  };

  const submitRating = async (bookingId) => {
    const entry = ratingInputs[bookingId] || {};
    if (!entry.rating) {
      setMessage('Pick a star rating first.');
      return;
    }
    try {
      await api.post(`/bookings/${bookingId}/rate`, entry, authHeader);
      setMessage('Thanks for your rating!');
      loadBookings();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not submit rating');
    }
  };

  const submitLink = async (bookingId) => {
    const link = linkInputs[bookingId];
    if (!link || !link.trim()) {
      setMessage('Enter a meeting link first.');
      return;
    }
    try {
      await api.put(`/bookings/${bookingId}/link`, { meeting_link: link }, authHeader);
      setMessage('Meeting link saved');
      loadBookings();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not save meeting link');
    }
  };

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">{isTutor ? 'Tutoring Requests' : 'My Bookings'}</h2>

        {isTutor && (
          <div className="mb-8 border-b border-[var(--color-line)] pb-6">
            <h3 className="text-lg mb-3">My Profile</h3>

            <form onSubmit={handleSetAvailability} className="mb-4">
              <label className="field-label">Availability Note</label>
              <input
                type="text"
                placeholder="e.g. Weekday evenings, 6-8pm"
                value={availabilityNote}
                onChange={(e) => setAvailabilityNote(e.target.value)}
                className="field-input"
              />
              <button type="submit" className="btn-secondary">Update Availability</button>
            </form>

            <p className="field-label">My Topics</p>
            {myTopics.length === 0 ? (
              <p className="text-[var(--color-ink)]/60 mb-3">You haven't listed any topics yet.</p>
            ) : (
              <ul className="mb-3">
                {myTopics.map((t) => (
                  <li key={t.id} className="mb-1">
                    {t.grade}: {t.topic}{' '}
                    <button onClick={() => handleRemoveTopic(t.id)} className="text-[var(--color-cinnabar)] underline text-sm">
                      remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAddTopic}>
              <select value={newTopicId} onChange={(e) => setNewTopicId(e.target.value)} className="field-input">
                <option value="">-- Add a topic you teach --</option>
                {allTopics.map((t) => (
                  <option key={t.id} value={t.id}>{t.grade}: {t.topic}</option>
                ))}
              </select>
              <button type="submit" className="btn-secondary">Add Topic</button>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="badge-error">{error}</p>
        ) : bookings.length === 0 ? (
          <p>No bookings yet.</p>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="border border-[var(--color-line)] rounded-sm p-4 mb-4">
              <p className="font-medium mb-1">
                {isTutor ? `Student: ${b.student_name}` : `Tutor: ${b.tutor_name}`}
              </p>
              <p className="text-[var(--color-ink)]/70 mb-1">{b.grade}: {b.topic}</p>
              <p className="text-[var(--color-ink)]/70 mb-1">
                Requested: {new Date(b.requested_time).toLocaleString()}
              </p>
              {b.suggested_time && (
                <p className="text-[var(--color-amber)] mb-1">
                  Suggested new time: {new Date(b.suggested_time).toLocaleString()}
                </p>
              )}
              <p className="mb-3">
                Status: <span className={
                  b.status === 'accepted' ? 'badge-success' : b.status === 'declined' ? 'badge-error' : ''
                }>{b.status}</span>
              </p>

              {isTutor && b.status === 'pending' && !b.suggested_time && (
                <div className="flex flex-wrap gap-2 items-center">
                  <button onClick={() => respondToBooking(b.id, 'accept')} className="btn-primary">Accept</button>
                  <button onClick={() => respondToBooking(b.id, 'decline')} className="btn-secondary">Decline</button>
                  <input
                    type="datetime-local"
                    onChange={(e) => setSuggestInputs({ ...suggestInputs, [b.id]: e.target.value })}
                    className="field-input mb-0"
                    style={{ width: 'auto', display: 'inline-block' }}
                  />
                  <button onClick={() => respondToBooking(b.id, 'suggest')} className="btn-secondary">Suggest Time</button>
                </div>
              )}

              {isTutor && b.status === 'accepted' && (
                <div className="flex gap-2 items-center mt-2">
                  <input
                    type="text"
                    placeholder="Paste Google Meet link"
                    defaultValue={b.meeting_link || ''}
                    onChange={(e) => setLinkInputs({ ...linkInputs, [b.id]: e.target.value })}
                    className="field-input mb-0"
                    style={{ width: 'auto', display: 'inline-block', minWidth: '220px' }}
                  />
                  <button onClick={() => submitLink(b.id)} className="btn-secondary">
                    {b.meeting_link ? 'Update Link' : 'Send Link'}
                  </button>
                </div>
              )}

              {!isTutor && b.suggested_time && b.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => respondToSuggestion(b.id, true)} className="btn-primary">Accept New Time</button>
                  <button onClick={() => respondToSuggestion(b.id, false)} className="btn-secondary">Decline</button>
                </div>
              )}

              {!isTutor && !!b.is_completed && (
                <div className="flex gap-2 items-center mt-2">
                  <select
                    onChange={(e) => setRatingInputs({ ...ratingInputs, [b.id]: { ...ratingInputs[b.id], rating: e.target.value } })}
                    className="field-input mb-0"
                    style={{ width: 'auto', display: 'inline-block' }}
                  >
                    <option value="">Rate this tutor</option>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
                  </select>
                  <button onClick={() => submitRating(b.id)} className="btn-secondary">Submit Rating</button>
                </div>
              )}

              {!isTutor && b.status === 'accepted' && b.meeting_link && (
                <p className="mt-2">
                  Meeting link: <a href={b.meeting_link} target="_blank" rel="noreferrer" className="underline text-[var(--color-blue)]">{b.meeting_link}</a>
                </p>
              )}

              {!isTutor && b.status === 'accepted' && !b.is_completed && (
                <p className="text-[var(--color-ink)]/60 mt-2 text-sm">You'll be able to rate this session after it takes place.</p>
              )}
            </div>
          ))
        )}

        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  );
}

export default MyBookings;
