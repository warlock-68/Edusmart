import { useState, useEffect } from 'react';
import api from '../api';

function getRole() {
  try {
    const token = localStorage.getItem('token');
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role;
  } catch {
    return null;
  }
}

function authHeader() {
  return { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } };
}

function renderNotes(body) {
  return body.split('\n').map((line, i) => {
    if (line.startsWith('## ')) {
      return <h3 key={i} className="text-xl mt-6 mb-2">{line.slice(3)}</h3>;
    }
    if (line.startsWith('- ')) {
      return <li key={i} className="ml-6 list-disc">{line.slice(2)}</li>;
    }
    if (line.trim() === '') {
      return <div key={i} style={{ height: 8 }} />;
    }
    return <p key={i}>{line}</p>;
  });
}

function ContentList() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const isAdmin = getRole() === 'admin';

  useEffect(() => {
    api.get('/content/notes', authHeader())
      .then((res) => setTopics(res.data))
      .catch(() => setError('Could not load topics'))
      .finally(() => setLoading(false));
  }, []);

  const openTopic = async (id) => {
    setError('');
    setMessage('');
    setEditing(false);
    try {
      const res = await api.get(`/content/notes/${id}`, authHeader());
      setNote(res.data);
    } catch {
      setError('Could not load these notes');
    }
  };

  const startEdit = () => {
    setDraft(note.body || '');
    setEditing(true);
    setMessage('');
  };

  const saveNote = async () => {
    setError('');
    try {
      await api.put(`/content/notes/${note.id}`, { body: draft }, authHeader());
      setNote({ ...note, body: draft });
      setTopics(topics.map((t) => (t.id === note.id ? { ...t, has_notes: 1 } : t)));
      setEditing(false);
      setMessage('Notes saved');
    } catch {
      setError('Could not save the notes');
    }
  };

  const grades = [...new Set(topics.map((t) => t.grade))];

  return (
    <div className="page-shell--wide">
      <div className="panel">
        <h2 className="text-2xl mb-6">Chemistry Notes</h2>
        {error && <p className="badge-error mb-4">{error}</p>}
        {message && <p className="mb-4">{message}</p>}
        {loading ? (
          <p>Loading topics...</p>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 260px' }}>
              {grades.map((g) => (
                <div key={g} className="mb-4">
                  <h3 className="text-lg mb-2">{g}</h3>
                  {topics.filter((t) => t.grade === g).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => openTopic(t.id)}
                      className="btn-secondary"
                      style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }}
                    >
                      {t.topic}{t.has_notes ? '' : ' (coming soon)'}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ flex: '2 1 360px' }}>
              {!note ? (
                <p>Select a topic to read its notes.</p>
              ) : (
                <div>
                  <h3 className="text-xl mb-1">{note.topic}</h3>
                  <p className="mb-4">{note.grade}</p>
                  {isAdmin && !editing && (
                    <button onClick={startEdit} className="btn-secondary mb-4">Edit notes</button>
                  )}
                  {editing ? (
                    <div>
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={20}
                        style={{ width: '100%', padding: 8 }}
                      />
                      <button onClick={saveNote} className="btn-secondary" style={{ marginRight: 8 }}>Save</button>
                      <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                    </div>
                  ) : note.body ? (
                    <div>{renderNotes(note.body)}</div>
                  ) : (
                    <p>Notes for this topic are coming soon.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ContentList;