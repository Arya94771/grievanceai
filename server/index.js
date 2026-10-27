const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore in environments where setting DNS servers is restricted
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const authRoutes = require('./routes/auth');
const brandKitRoutes = require('./routes/brandKit');
const draftsRoutes = require('./routes/drafts');
const { seedBrewlineWorkspace } = require('./seed/seeder');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    uptime: process.uptime()
  });
});

// Auth Routes
app.use('/api/auth', authRoutes);
app.use('/api/brand-kit', brandKitRoutes);
app.use('/api/drafts', draftsRoutes);

// Serve client in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('<h1>GrievanceAI API Server</h1><p>Client build not detected. Run <code>npm run build</code> in the root directory.</p>');
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('[GrievanceAI Server Error]:', err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred',
    fallback: true
  });
});

// Database connection & startup helper
async function startServer() {
  if (process.env.MONGODB_URI) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB Atlas');

      // Idempotent initial seed check
      seedBrewlineWorkspace().catch(err => {
        console.error('Initial auto-seed check encountered error:', err.message);
      });
    } catch (err) {
      console.error('MongoDB connection error:', err.message);
    }
  } else {
    console.warn('Warning: MONGODB_URI is not set in environment.');
  }

  const server = app.listen(PORT, () => {
    console.log(`GrievanceAI Server running on port ${PORT}`);
  });

  return { app, server };
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
