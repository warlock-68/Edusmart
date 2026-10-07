import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Upload from './pages/Upload';
import ContentList from './pages/ContentList';
import AskQuestion from './pages/AskQuestion';
import Quiz from './pages/Quiz';
import Dashboard from './pages/Dashboard';
import MyProgress from './pages/MyProgress';
import Tutors from './pages/Tutors';
import MyBookings from './pages/MyBookings';
import BecomeTutor from './pages/BecomeTutor';
import AdminApplications from './pages/AdminApplications';

// Read the logged-in user saved by the Login page (null if nobody is logged in)
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (err) {
    return null;
  }
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const user = getStoredUser();
  const role = user?.role || null;

  const isStudent = role === 'student';
  const isTutor = role === 'tutor';
  const isAdmin = role === 'admin';

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const linkClass = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <BrowserRouter>
      <nav className="navbar">
        <div className="flex items-center justify-between w-full md:w-auto">
          <span className="font-serif text-lg font-semibold text-[var(--color-ink)] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-bunsen)" strokeWidth="1.5">
              <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
            </svg>
            EduSmart
          </span>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2">
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>

        <div className={`${menuOpen ? 'flex' : 'hidden'} flex-col gap-2 w-full md:flex md:flex-row md:gap-6 md:w-auto`}>
          {/* Visitors who are not logged in */}
          {!role && (
            <>
              <NavLink onClick={closeMenu} to="/register" className={linkClass}>Register</NavLink>
              <NavLink onClick={closeMenu} to="/login" className={linkClass}>Login</NavLink>
              <NavLink onClick={closeMenu} to="/become-tutor" className={linkClass}>Become a Tutor</NavLink>
            </>
          )}

          {/* Tutors and admins */}
          {(isTutor || isAdmin) && (
            <NavLink onClick={closeMenu} to="/upload" className={linkClass}>Upload</NavLink>
          )}

          {/* Everyone who is logged in */}
          {role && (
            <NavLink onClick={closeMenu} to="/content" className={linkClass}>Content</NavLink>
          )}

          {/* Students and admins */}
          {(isStudent || isAdmin) && (
            <>
              <NavLink onClick={closeMenu} to="/ask" className={linkClass}>Ask a Question</NavLink>
              <NavLink onClick={closeMenu} to="/quiz" className={linkClass}>Quiz</NavLink>
            </>
          )}

          {/* Tutors and admins */}
          {(isTutor || isAdmin) && (
            <NavLink onClick={closeMenu} to="/dashboard" className={linkClass}>Dashboard</NavLink>
          )}

          {/* Students and admins */}
          {(isStudent || isAdmin) && (
            <>
              <NavLink onClick={closeMenu} to="/progress" className={linkClass}>My Progress</NavLink>
              <NavLink onClick={closeMenu} to="/tutors" className={linkClass}>Find a Tutor</NavLink>
            </>
          )}

          {/* Everyone who is logged in */}
          {role && (
            <NavLink onClick={closeMenu} to="/bookings" className={linkClass}>My Bookings</NavLink>
          )}

          {/* Admin only */}
          {isAdmin && (
            <NavLink onClick={closeMenu} to="/admin/applications" className={linkClass}>Applications</NavLink>
          )}

          {/* Logout, only when logged in */}
          {role && (
            <button
              type="button"
              onClick={logout}
              className="text-left md:text-center cursor-pointer text-[var(--color-ink)]"
            >
              Logout ({user.name})
            </button>
          )}
        </div>
      </nav>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/become-tutor" element={<BecomeTutor />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/content" element={<ContentList />} />
        <Route path="/ask" element={<AskQuestion />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/progress" element={<MyProgress />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/admin/applications" element={<AdminApplications />} />
        <Route path="/" element={<h2 style={{ textAlign: 'center' }}>Welcome to EduSmart</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;