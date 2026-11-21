import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    return null;
  }
}

const WELCOME = {
  from: 'bot',
  text: 'Hi! Ask me any Chemistry question. You can write in English, Kiswahili or Sheng.'
};

function ChatBot() {
  const user = getStoredUser();
  const allowed = user && (user.role === 'student' || user.role === 'admin');

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open, sending]);

  if (!allowed) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((prev) => [...prev, { from: 'student', text }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/chat', { message: text }, { timeout: 60000 });
      setMessages((prev) => [...prev, { from: 'bot', data: res.data }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: err.response?.data?.error || 'Something went wrong. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  const chooseTutors = (index, choice) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === index ? { ...m, tutorChoice: choice } : m))
    );
  };

  const bubble = {
    maxWidth: '88%',
    padding: '10px 12px',
    borderRadius: 4,
    fontSize: 14,
    lineHeight: 1.45,
    marginBottom: 10,
    whiteSpace: 'pre-wrap'
  };

  const renderBot = (m, i) => {
    if (m.data) {
      const d = m.data;
      return (
        <div key={i} style={{ ...bubble, background: '#EEF1EC', alignSelf: 'flex-start' }}>
          {d.understood_as && (
            <p style={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7, marginBottom: 6 }}>
              I understood: {d.understood_as}
            </p>
          )}
          <p>{d.reply}</p>
          {d.topic && (
            <p style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>
              Topic: {d.grade} - {d.topic}
            </p>
          )}
          {d.struggling && (
            <p style={{ fontSize: 13, marginTop: 8, color: 'var(--color-cinnabar)', fontWeight: 600 }}>
              You have asked {d.question_count} questions about this topic, so it looks like you are finding
              it hard. A tutor can help.
            </p>
          )}
          {d.topic_id && !m.tutorChoice && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                Would you like a tutor for this topic?
              </p>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '4px 12px', marginRight: 8, fontSize: 13 }}
                onClick={() => chooseTutors(i, 'yes')}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: 13 }}
                onClick={() => chooseTutors(i, 'no')}
              >
                No thanks
              </button>
            </div>
          )}
          {m.tutorChoice === 'yes' && d.tutors && d.tutors.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 8 }}>
              No tutor has listed this topic yet. Please check again soon.
            </p>
          )}
          {m.tutorChoice === 'no' && (
            <p style={{ fontSize: 13, marginTop: 8, opacity: 0.75 }}>
              No problem. Ask me anything else!
            </p>
          )}
          {m.tutorChoice === 'yes' && d.tutors && d.tutors.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tutors who teach this topic:</p>
              {d.tutors.map((t) => (
                <Link
                  key={t.id}
                  to={`/tutors/${t.id}`}
                  style={{
                    display: 'block',
                    background: 'white',
                    border: '1px solid var(--color-line)',
                    borderRadius: 4,
                    padding: '6px 8px',
                    marginBottom: 6,
                    textDecoration: 'none',
                    color: 'var(--color-ink)'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  {t.headline && <span style={{ display: 'block', fontSize: 12 }}>{t.headline}</span>}
                  <span style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>
                    {t.avg_rating ? `${t.avg_rating} / 5 (${t.rating_count} ratings)` : 'No ratings yet'}
                  </span>
                </Link>
              ))}
            </div>
          )}
          {d.topic_id && (
            <Link
              to={`/quiz?topic_id=${d.topic_id}`}
              style={{ display: 'inline-block', marginTop: 6, fontSize: 13, color: 'var(--color-bunsen)', textDecoration: 'underline' }}
            >
              Practice this topic
            </Link>
          )}
        </div>
      );
    }
    return (
      <div
        key={i}
        style={{
          ...bubble,
          background: m.isError ? '#FBEAE6' : '#EEF1EC',
          color: m.isError ? 'var(--color-cinnabar)' : 'inherit',
          alignSelf: 'flex-start'
        }}
      >
        {m.text}
      </div>
    );
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 'min(380px, calc(100vw - 32px))',
            height: 'min(520px, 70vh)',
            background: 'white',
            borderTop: '4px solid var(--color-bunsen)',
            borderRadius: 4,
            boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 50
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderBottom: '1px solid var(--color-line)'
            }}
          >
            <strong style={{ fontFamily: 'var(--font-serif)' }}>EduSmart Chat</strong>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" style={{ fontSize: 18 }}>
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column' }}>
            {messages.map((m, i) =>
              m.from === 'student' ? (
                <div
                  key={i}
                  style={{ ...bubble, background: 'var(--color-bunsen)', color: 'white', alignSelf: 'flex-end' }}
                >
                  {m.text}
                </div>
              ) : (
                renderBot(m, i)
              )
            )}
            {sending && (
              <div style={{ ...bubble, background: '#EEF1EC', alignSelf: 'flex-start', opacity: 0.7 }}>
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid var(--color-line)' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={500}
              placeholder="Type your question..."
              disabled={sending}
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid var(--color-line)',
                borderRadius: 4,
                fontSize: 14
              }}
            />
            <button type="button" onClick={send} disabled={sending || !input.trim()} className="btn-primary">
              Send
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--color-bunsen)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          cursor: 'pointer'
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );
}

export default ChatBot;