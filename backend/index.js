const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { sequelize } = require('./models');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Secure CORS configuration
const allowedOrigins = [
  'http://localhost:5173', // Vite local development frontend
  'http://localhost:3000', // Alt local dev port
  'http://127.0.0.1:5173',
  'http://localhost',       // Capacitor Android local origin
  'https://localhost',      // Capacitor Android secure local origin
  'capacitor://localhost',  // Capacitor iOS local origin
  'https://rgclocker.vercel.app', // Production Vercel App
  process.env.FRONTEND_URL  // Production frontend URL (Vercel)
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman/curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Check if origin is a vercel subdomain
    const isVercel = origin.endsWith('.vercel.app');
    
    // Check if the request origin is in the allowed list, or is Vercel, or is wildcarded
    if (allowedOrigins.indexOf(origin) !== -1 || isVercel || allowedOrigins.includes('*') || process.env.FRONTEND_URL === '*') {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Locker-Token']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Status Route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    service: 'rgclocker-api'
  });
});

// Import and use routes
const authRoutes = require('./routes/authRoutes');
const lockerRoutes = require('./routes/lockerRoutes');
const documentRoutes = require('./routes/documentRoutes');

const bcrypt = require('bcryptjs');
const { User } = require('./models');

app.use('/api/auth', authRoutes);
app.use('/api/lockers', lockerRoutes);
app.use('/api/documents', documentRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server and sync DB
async function startServer() {
  try {
    // Authenticate with DB
    await sequelize.authenticate();
    console.log('PostgreSQL database connection established successfully.');

    // Sync database models
    // Automatically sync database tables and new columns (safe for easy cloud prototypes)
    await sequelize.sync({ alter: true });
    console.log('Database models synchronized successfully.');

    // Seed master user: locker / Tabulario-801
    const masterUsername = 'locker';
    const masterPassword = 'Tabulario-801';
    const masterEmail = 'master@rgclocker.local';

    const existingMaster = await User.findOne({ where: { username: masterUsername } });
    if (!existingMaster) {
      console.log(`Seeding master user '${masterUsername}'...`);
      const passwordHash = await bcrypt.hash(masterPassword, 10);
      await User.create({
        username: masterUsername,
        email: masterEmail,
        passwordHash,
        isActive: true, // Master user is pre-activated!
        isVerified: true
      });
      console.log(`Master user '${masterUsername}' successfully seeded!`);
    } else {
      console.log(`Master user '${masterUsername}' already exists.`);
      // Defensive check: ensure the master user is always active and verified on startup
      if (!existingMaster.isActive || !existingMaster.isVerified) {
        console.log(`Forcing master user '${masterUsername}' to be Active and Verified...`);
        existingMaster.isActive = true;
        existingMaster.isVerified = true;
        await existingMaster.save();
        console.log(`Master user '${masterUsername}' is now Active and Verified.`);
      }
    }

    // Validate Google Drive configuration on startup if OAuth2 is used
    try {
      const { getDriveClient, validateOAuth2Credentials } = require('./services/googleDriveService');
      const drive = getDriveClient();
      if (drive) {
        await validateOAuth2Credentials();
      }
    } catch (gdError) {
      console.warn('\n[Warning] Google Drive initialization warning on startup:', gdError.message);
      console.warn('Please check your Google Drive environment variables in backend/.env\n');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`rgclocker secure API server running on port ${PORT} (Listening on all interfaces)`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
}

// Only start the server if not imported by tests
if (require.main === module) {
  startServer();
}

module.exports = app;
