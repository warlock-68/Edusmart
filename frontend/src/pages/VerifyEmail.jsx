import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState({ text: '', type: 'error' });
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: 'error' });
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-email', { email, code });
      setMessage({ text: res.data.message, type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || 'Something went wrong',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setMessage({ text: 'Please enter your email first.', type: 'error' });
      return;
    }
    setMessage({ text: '', type: 'error' });
    setLoading(true);
    try {
      const res = await api.post('/auth/resend-verification', { email }, { timeout: 60000 });
      setMessage({ text: res.data.message, type: 'success' });
    } catch (err) {
      setMessage({
        text: err.response?.data?.error || 'Something went wrong',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Verify your email</h2>
        <p className="mb-4">
          We sent a 6-digit code to your email. Enter it below to activate your account.
          The code expires in 15 minutes.
        </p>
        <form onSubmit={handleVerify}>
          <label className="field-label">Email</label>
          <input
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="field-input"
          />

          <label className="field-label">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="field-input"
          />

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : 'Verify'}
          </button>
        </form>

        {message.text && (
          <p className={`mt-4 ${message.type === 'success' ? 'badge-success' : 'badge-error'}`}>
            {message.text}
          </p>
        )}

        <p className="mt-4">
          Didn't get a code?{' '}
          <button type="button" onClick={handleResend} className="underline text-[var(--color-bunsen)]">
            Resend code
          </button>
        </p>
        <p className="mt-2">
          <Link to="/login" className="underline text-[var(--color-bunsen)]">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyEmail;