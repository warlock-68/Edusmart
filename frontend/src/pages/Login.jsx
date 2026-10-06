import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('sessionExpired') === 'true') {
      setMessage('Your session has expired. Please log in again.');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Full reload so the navbar picks up the new login, then go to a starting page for this role
      const role = res.data.user.role;
      if (role === 'admin') {
        window.location.href = '/admin/applications';
      } else if (role === 'tutor') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/ask';
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className="page-shell">
      <div className="panel">
        <h2 className="text-2xl mb-6">Log in to EduSmart</h2>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            className="field-input"
          />

          <label className="field-label">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            className="field-input"
          />

          <button type="submit" className="btn-primary">Log In</button>
        </form>
        <p className="mt-3">
          <Link to="/forgot-password" className="text-[var(--color-bunsen)] underline text-sm">
            Forgot Password?
          </Link>
        </p>
        {message && <p className="mt-4">{message}</p>}
      </div>
    </div>
  );
}

export default Login;