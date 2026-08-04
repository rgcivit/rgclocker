const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sequelize } = require('./models');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*', // We can restrict this in production
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
    // In dev: alter is safe; for production we might want migrations or simple sync
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
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
        passwordHash
      });
      console.log(`Master user '${masterUsername}' successfully seeded!`);
    } else {
      console.log(`Master user '${masterUsername}' already exists.`);
    }

    app.listen(PORT, () => {
      console.log(`rgclocker secure API server running on port ${PORT}`);
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
