const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const calculatorRoutes = require('./routes/calculatorRoutes');
const feedstockRoutes = require('./routes/feedstockRoutes');
const communityRoutes = require('./routes/communityRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const plantRoutes = require('./routes/plantRoutes');
const mapRoutes = require('./routes/mapRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const householdRoutes = require('./routes/householdRoutes');
const villageRoutes = require('./routes/villageRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const optimizerRoutes = require('./routes/optimizerRoutes');
const incentiveRoutes = require('./routes/incentiveRoutes');
const digestateRoutes = require('./routes/digestateRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');
const wasteCollectionRoutes = require('./routes/wasteCollectionRoutes');
const breakdownRoutes = require('./routes/breakdownRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const gasInterruptionRoutes = require('./routes/gasInterruptionRoutes');
const subsidyRoutes = require('./routes/subsidyRoutes');
const financeRoutes = require('./routes/financeRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const syncRoutes = require('./routes/syncRoutes');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// System Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Rural Community Biogas Feasibility & Resource Management System API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/feedstock', feedstockRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/villages', villageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/optimizer', optimizerRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/digestate', digestateRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/waste-collection', wasteCollectionRoutes);
app.use('/api/breakdowns', breakdownRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/gas-interruptions', gasInterruptionRoutes);
app.use('/api/subsidies', subsidyRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/sync', syncRoutes);

const fs = require('fs');
const path = require('path');

// Serve static frontend in production if built
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to Database and start server
if (require.main === module) {
  connectDB().then(() => {
    const startServer = (portToUse) => {
      const serverInstance = app.listen(portToUse, '0.0.0.0', () => {
        console.log(`[Server] Rural Biogas Backend Server running in ${process.env.NODE_ENV || 'development'} mode on port ${portToUse}`);
        console.log(`[Server] API Base URL: http://localhost:${portToUse}/api`);
      });

      serverInstance.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && portToUse < Number(PORT) + 5) {
          console.warn(`[Server] Port ${portToUse} is in use, trying next port ${portToUse + 1}...`);
          startServer(portToUse + 1);
        } else {
          console.error('[Server] Fatal server listen error:', err.message);
          process.exit(1);
        }
      });
    };

    startServer(Number(PORT));
  }).catch(err => {
    console.error('[Server] Fatal error on bootstrap:', err.message);
    process.exit(1);
  });
}

app.connectDB = connectDB;
app.app = app;
module.exports = app;
