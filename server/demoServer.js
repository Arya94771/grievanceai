/**
 * Zero-Config Local Demo Server
 * Boots an in-memory MongoDB instance with MongoMemoryServer,
 * enables AI_MODE=mock, auto-seeds Brewline brand assets & sample drafts,
 * and launches Express API + Vite client on port 5000.
 */

process.env.AI_MODE = 'mock';
process.env.PORT = process.env.PORT || '5000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'demo_local_in_memory_secret_key_2026';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function startDemoServer() {
  console.log('====================================================');
  console.log('🚀 Starting GrievanceAI Zero-Config Local Demo Mode');
  console.log('   - Database: In-Memory MongoDB (MongoMemoryServer)');
  console.log('   - AI Engine: Mock Mode (Recorded Gemini Fixtures)');
  console.log('====================================================');

  try {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    process.env.MONGODB_URI = uri;

    console.log(`[Demo] In-memory MongoDB running at: ${uri}`);
    await mongoose.connect(uri);
    console.log('[Demo] Connected to in-memory MongoDB.');

    // Seed Brewline workspace
    const { seedBrewlineWorkspace } = require('./seed/seeder');
    await seedBrewlineWorkspace({ forceReset: true });
    console.log('[Demo] Auto-seeded Brewline Coffee Co. demo data & visuals.');

    // Start Express app
    const app = require('./index');
    console.log(`[Demo] GrievanceAI Demo Server ready at: http://localhost:${process.env.PORT}`);
    console.log('Demo Credentials:');
    console.log('  - Creator:  aarav@brewline.in / password123');
    console.log('  - Manager:  kavita@brewline.in / password123');
    console.log('  - Reviewer: priya@brewline.in / password123');
    console.log('  - Admin:    admin@brewline.in / password123');
  } catch (err) {
    console.error('[Demo] Failed to start demo server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startDemoServer();
}

module.exports = { startDemoServer };
