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



function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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
          <NavLink onClick={closeMenu} to="/register" className={({isActive}) => isActive ? "active" : ""}>Register</NavLink>
          <NavLink onClick={closeMenu} to="/login" className={({isActive}) => isActive ? "active" : ""}>Login</NavLink>
          <NavLink onClick={closeMenu} to="/upload" className={({isActive}) => isActive ? "active" : ""}>Upload</NavLink>
          <NavLink onClick={closeMenu} to="/content" className={({isActive}) => isActive ? "active" : ""}>Content</NavLink>
          <NavLink onClick={closeMenu} to="/ask" className={({isActive}) => isActive ? "active" : ""}>Ask a Question</NavLink>
          <NavLink onClick={closeMenu} to="/quiz" className={({isActive}) => isActive ? "active" : ""}>Quiz</NavLink>
          <NavLink onClick={closeMenu} to="/dashboard" className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
          <NavLink onClick={closeMenu} to="/progress" className={({isActive}) => isActive ? "active" : ""}>My Progress</NavLink>
          <NavLink onClick={closeMenu} to="/tutors" className={({isActive}) => isActive ? "active" : ""}>Find a Tutor</NavLink>
          <NavLink onClick={closeMenu} to="/bookings" className={({isActive}) => isActive ? "active" : ""}>My Bookings</NavLink>
        </div>
      </nav>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/content" element={<ContentList />} />
        <Route path="/ask" element={<AskQuestion />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/progress" element={<MyProgress />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/" element={<h2 style={{ textAlign: 'center' }}>Welcome to EduSmart</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
