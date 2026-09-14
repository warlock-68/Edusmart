import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Upload from './pages/Upload';
import ContentList from './pages/ContentList';
import AskQuestion from './pages/AskQuestion';
import Quiz from './pages/Quiz';
import Dashboard from './pages/Dashboard';
import MyProgress from './pages/MyProgress';



function App() {
  return (
    <BrowserRouter>
      <nav style={{ textAlign: 'center', padding: 20, fontFamily: 'sans-serif' }}>
  <Link to="/register" style={{ marginRight: 20 }}>Register</Link>
  <Link to="/login" style={{ marginRight: 20 }}>Login</Link>
  <Link to="/upload" style={{ marginRight: 20 }}>Upload</Link>
  <Link to="/content" style={{ marginRight: 20 }}>Content</Link>
  <Link to="/ask" style={{ marginRight: 20 }}>Ask a Question</Link>
  <Link to="/quiz" style={{ marginRight: 20 }}>Quiz</Link>
  <Link to="/dashboard" style={{ marginRight: 20 }}>Dashboard</Link>
  <Link to="/progress">My Progress</Link>
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
  <Route path="/" element={<h2 style={{ textAlign: 'center' }}>Welcome to EduSmart</h2>} />
</Routes>
    </BrowserRouter>
  );
}

export default App;