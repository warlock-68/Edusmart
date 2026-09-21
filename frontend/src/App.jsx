import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Upload from './pages/Upload';
import ContentList from './pages/ContentList';
import AskQuestion from './pages/AskQuestion';
import Quiz from './pages/Quiz';
import Dashboard from './pages/Dashboard';
import MyProgress from './pages/MyProgress';
import Tutors from './pages/Tutors';
import MyBookings from './pages/MyBookings';



function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <span className="font-serif text-lg font-semibold text-[var(--color-ink)] flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-bunsen)" strokeWidth="1.5">
            <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" />
          </svg>
          EduSmart
        </span>
        <NavLink to="/register" className={({isActive}) => isActive ? "active" : ""}>Register</NavLink>
        <NavLink to="/login" className={({isActive}) => isActive ? "active" : ""}>Login</NavLink>
        <NavLink to="/upload" className={({isActive}) => isActive ? "active" : ""}>Upload</NavLink>
        <NavLink to="/content" className={({isActive}) => isActive ? "active" : ""}>Content</NavLink>
        <NavLink to="/ask" className={({isActive}) => isActive ? "active" : ""}>Ask a Question</NavLink>
        <NavLink to="/quiz" className={({isActive}) => isActive ? "active" : ""}>Quiz</NavLink>
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
        <NavLink to="/progress" className={({isActive}) => isActive ? "active" : ""}>My Progress</NavLink>
        <NavLink to="/tutors" className={({isActive}) => isActive ? "active" : ""}>Find a Tutor</NavLink>
        <NavLink to="/bookings" className={({isActive}) => isActive ? "active" : ""}>My Bookings</NavLink>
      </nav>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
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