const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content'); 
const queryRoutes = require('./routes/query');
const quizRoutes = require('./routes/quiz');
const dashboardRoutes = require('./routes/dashboard');
const tutorRoutes = require('./routes/tutors');
const bookingRoutes = require('./routes/bookings');


const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'EduSmart backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes); 
app.use('/api/query', queryRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tutors', tutorRoutes);
app.use('/api/bookings', bookingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));