const mongoose = require('mongoose');

let mongod = null;

const connectDB = async () => {
  const externalUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_URI;
  const uri = externalUri || 'mongodb://127.0.0.1:27017/biogas_db';

  try {
    const connectOptions = {
      serverSelectionTimeoutMS: externalUri ? 12000 : 3000,
      dbName: 'biogas_db'
    };
    if (uri.includes('@')) {
      connectOptions.authSource = 'admin';
    }

    await mongoose.connect(uri, connectOptions);
    console.log(
      `[Database] MongoDB Connected to external/local instance: ${mongoose.connection.host}:${mongoose.connection.port}/${mongoose.connection.name}`
    );

    // Seed initial realistic dataset if connected database is brand new / empty
    const { seedDatabaseIfEmpty } = require('../seeds/seedData');
    await seedDatabaseIfEmpty();
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
