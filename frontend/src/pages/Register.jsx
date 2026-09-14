import { useState } from 'react';
import api from '../api';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.post('/auth/register', form);
      setMessage('Registered successfully! You can now log in.');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>Register for EduSmart</h2>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }} />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }} />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }} />
        <select name="role" value={form.role} onChange={handleChange} style={{ display: 'block', width: '100%', marginBottom: 10, padding: 8 }}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="tutor">Tutor</option>
        </select>
        <button type="submit" style={{ width: '100%', padding: 10 }}>Register</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default Register;