const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// Body parser
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

// Security + performance middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

// Enable CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/contact', require('./routes/contact'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'All Win Paint Shop API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '..', 'frontend', 'build');
  const indexHtml = path.join(clientBuildPath, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(express.static(clientBuildPath, {
      maxAge: '1y',
      etag: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.get(/^\/(?!api).*/, (req, res) => {
      res.sendFile(indexHtml);
    });
  } else {
    console.warn('Frontend build not found. Skipping static file serving.');
  }
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Server Error',
    error: isDev ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║                                                            ║
  ║   🎨 All Win Paint Shop - Karur, Tamil Nadu               ║
  ║                                                            ║
  ║   Server running on port ${PORT}                           ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}    ║
  ║                                                            ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});
