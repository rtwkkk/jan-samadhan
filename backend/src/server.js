const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Trim whitespace from critical WhatsApp env vars (prevents auth/matching issues)
['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID', 'WHATSAPP_VERIFY_TOKEN', 'META_APP_SECRET', 'GROQ_API_KEY'].forEach(key => {
  if (process.env[key]) process.env[key] = process.env[key].trim();
});

console.log('[Startup] WhatsApp Token loaded:', process.env.WHATSAPP_ACCESS_TOKEN ? `${process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 10)}...${process.env.WHATSAPP_ACCESS_TOKEN.substring(process.env.WHATSAPP_ACCESS_TOKEN.length - 5)}` : 'MISSING');
console.log('[Startup] Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID || 'MISSING');
console.log('[Startup] WABA ID:', process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'MISSING');

// Connect to database
connectDB().then(() => {
  // Seed institutions
  require('./seedInstitutions')();
});

const app = express();

// Middleware
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
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
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));
app.use('/api/sarvam', require('./routes/sarvamRoutes'));

// Static folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'API is running' });
});

// Serve React frontend
const frontendPath = path.join(__dirname, '../../dist');

app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
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