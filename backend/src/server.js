const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB().then(() => {
  // Seed institutions
  require('./seedInstitutions')();
});

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/jagriti', require('./routes/jagritiRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/public', require('./routes/publicRoutes'));
app.use('/api/university', require('./routes/universityRoutes'));
app.use('/api/industry', require('./routes/industryRoutes'));

// Static folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));