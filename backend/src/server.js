const express = require('express');
const dotenv = require('dotenv');

// Load env vars - MUST BE DONE BEFORE REQUIRING OTHER MODULES
dotenv.config();

const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const globalErrorHandler = require('./middleware/error.middleware');
const AppError = require('./utils/appError');
const apiRoutes = require('./routes');
const initCronJobs = require('./services/cron.service');
const passport = require('passport');
require('./config/passport'); // Load Passport Strategy
// Initialize Workers
require('./workers/index.worker');

console.log('Environment variables loaded.');
if (process.env.GITHUB_TOKEN) {
  console.log(`GITHUB_TOKEN detected (Length: ${process.env.GITHUB_TOKEN.length})`);
} else {
  console.error('CRITICAL: GITHUB_TOKEN not found in environment!');
}

// Connect to database
connectDB();

// Init Background Jobs
initCronJobs();

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 10000,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!',
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));

// CORS
app.use(cors());

// Data compression
app.use(compression());

// Initialize Passport
app.use(passport.initialize());

// 2) ROUTES
app.use('/api/v1', apiRoutes);

// Handle undefined routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// 3) ERROR HANDLING
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
