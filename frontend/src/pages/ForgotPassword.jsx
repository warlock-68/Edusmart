import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

function ForgotPassword() {
  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { email, code, newPassword });
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Reset Your Password</h2>

        {step === 'request' && (
          <form onSubmit={handleRequestCode}>
            <label className="field-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="field-input"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleResetPassword}>
            <p className="mb-4 text-[var(--color-ink)]/70">
              Enter the 6-digit code sent to <strong>{email}</strong>, along with your new password.
            </p>
            <label className="field-label">Reset Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
              className="field-input"
            />

            <label className="field-label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="field-input"
            />

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <p className="mt-3">
              <button
                type="button"
                onClick={() => setStep('request')}
                className="text-[var(--color-bunsen)] underline text-sm"
              >
                Didn't get a code? Try again
              </button>
            </p>
          </form>
        )}

        {error && <p className="badge-error mt-4">{error}</p>}
        {message && <p className="mt-4">{message}</p>}

        <p className="mt-4">
          <Link to="/login" className="text-[var(--color-bunsen)] underline text-sm">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
