import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { connectDB, disconnectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import tripRoutes from './routes/trip.routes.js';
import photoRoutes from './routes/photo.routes.js';
import discoverRoutes from './routes/discovery.routes.js';

// --------------------------------------------------
// INITIALIZE EXPRESS APPLICATION
// --------------------------------------------------

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Render runs the application behind a reverse proxy.
// Set this only when the deployed proxy topology has
// exactly one trusted proxy hop before the application.
if (process.env.TRUST_PROXY_HOPS !== undefined) {
  const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS);

  if (
    !Number.isInteger(trustProxyHops) ||
    trustProxyHops < 0
  ) {
    throw new Error(
      'TRUST_PROXY_HOPS must be a non-negative integer.'
    );
  }

  app.set('trust proxy', trustProxyHops);
} else if (process.env.NODE_ENV === 'production') {
  // Configure TRUST_PROXY_HOPS in Render only after
  // verifying the actual trusted proxy topology.
  console.warn(
    'TRUST_PROXY_HOPS is not configured; verify proxy settings before enabling IP-based rate limiting.'
  );
}

// --------------------------------------------------
// CORS CONFIGURATION
// --------------------------------------------------

const allowedOrigins = new Set(
  [
    'https://wanderplan-ai-elb8.onrender.com',
    'https://wanderplanai-1-10em.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174',
    ...(process.env.CLIENT_URL || '').split(','),
  ]
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => url.replace(/\/+$/, ''))
);

// --------------------------------------------------
// SECURITY MIDDLEWARE
// --------------------------------------------------

app.disable('x-powered-by');

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without Origin, such as health checks.
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, '');

      if (allowedOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn('CORS blocked origin:', origin);

      const error = new Error('Origin not allowed by CORS');
      error.statusCode = 403;

      return callback(error);
    },

    credentials: true,

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
    ],

    optionsSuccessStatus: 204,
  })
);

// --------------------------------------------------
// REQUEST PARSING
// --------------------------------------------------

app.use(express.json({ limit: '1mb' }));

app.use(
  express.urlencoded({
    extended: false,
    limit: '1mb',
  })
);

app.use(cookieParser());

// --------------------------------------------------
// GLOBAL API RATE LIMITER
// --------------------------------------------------

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,

  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

app.use('/api', apiRateLimit);

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'WanderPlan AI API is running',
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/discover', discoverRoutes);

// --------------------------------------------------
// UNKNOWN ENDPOINT HANDLER
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// --------------------------------------------------
// CENTRALIZED ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error('Server error:', {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack:
      process.env.NODE_ENV === 'development'
        ? err.stack
        : undefined,
  });

  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : err.message === 'Origin not allowed by CORS'
        ? 403
        : 500;

  res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500
        ? 'Internal server error'
        : err.message,
  });
});

// --------------------------------------------------
// SERVER STATE
// --------------------------------------------------

let server = null;
let shuttingDown = false;

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

async function startServer() {
  try {
    console.log('Starting WanderPlan AI API...');
    console.log('Allowed frontend origins:', [...allowedOrigins]);
    console.log('Configured port:', PORT);

    await connectDB();

    console.log('MongoDB connection established.');

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`WanderPlan AI API listening on port ${PORT}`);
      console.log('Health check: /api/health');
      console.log('Authentication routes: /api/auth');
      console.log('Trip routes: /api/trips');
      console.log('Photo routes: /api/photos');
      console.log('Discovery routes: /api/discover');
    });

    server.on('error', (error) => {
      console.error('HTTP server error:', error);

      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
      }

      process.exitCode = 1;
    });
  } catch (error) {
    console.error(
      'Failed to start WanderPlan AI:',
      error.message
    );

    process.exitCode = 1;
  }
}

// --------------------------------------------------
// GRACEFUL SHUTDOWN
// --------------------------------------------------

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }

    await disconnectDB();

    console.log('Server and database disconnected.');
  } catch (error) {
    console.error('Shutdown error:', error.message);
    process.exitCode = 1;
  }
}

// --------------------------------------------------
// PROCESS SIGNALS
// --------------------------------------------------

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

// --------------------------------------------------
// UNHANDLED ERRORS
// --------------------------------------------------

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);

  void shutdown('uncaughtException').finally(() => {
    process.exit(1);
  });
});

// --------------------------------------------------
// START APPLICATION
// --------------------------------------------------

void startServer();
