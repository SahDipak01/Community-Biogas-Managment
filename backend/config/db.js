const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/biogas_db';

  try {
    // Attempt connecting with 3 second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`[Database] MongoDB Connected to external/local instance: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`);
    return;
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection to ${uri} failed: ${err.message}`);
    console.log('[Database] Starting in-memory MongoDB server for zero-setup local execution...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();

      await mongoose.connect(memoryUri);
      console.log(`[Database] In-memory MongoDB Server successfully active at: ${memoryUri}`);
      console.log('[Database] Full Mongoose schemas, queries, indexes, and relations are fully operational.');

      // Automatically trigger initial seeding if memory instance is empty
      const { seedDatabaseIfEmpty } = require('../seeds/seedData');
      await seedDatabaseIfEmpty();
    } catch (memErr) {
      console.error('[Database] Failed to initialize in-memory MongoDB:', memErr.message);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
  } catch (err) {
    console.error('Error disconnecting DB:', err.message);
  }
};

module.exports = { connectDB, disconnectDB };
