const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const path = require('path');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

const app = express();

// 1. Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false // Allows loading images uploaded in different domains
}));

// 2. CORS configuration (supports frontend hosted on Vercel connecting to Railway backend)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5050',
  'http://127.0.0.1:5050',
  'http://127.0.0.1:5500', // VS Code Live Server default
  'http://localhost:5500',
  process.env.FRONTEND_URL // Dynamic Vercel deployment URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In production, we check allowedOrigins, in development we can allow all or select ones
    const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
    if (isAllowed || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy: Origin not allowed by configurations'), false);
  },
  credentials: true
}));

// 3. Rate Limiter (Input Protection against DOS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// 4. Body Parser
app.use(express.json({ limit: '10kb' })); // Protections against payload size attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 5. Data Sanitization against XSS (Cross Site Scripting)
app.use(xss());

// 6. Static Upload Folders (Allows viewing event banners/avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Optional: Serve frontend in local development
app.use(express.static(path.join(__dirname, '../frontend')));

// 7. Mount Routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/events', require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, message: 'CampusPulse Full-Stack API is active and healthy.' });
});

// Fallback Route handler for API
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'Requested API resource not found' });
});

// 8. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`⚡ CampusPulse Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
