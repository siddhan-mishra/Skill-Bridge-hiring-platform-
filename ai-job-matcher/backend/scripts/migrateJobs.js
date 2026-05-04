/**
 * migrateJobs.js — One-time DB migration script
 *
 * Fixes all jobs created BEFORE Step 1 schema update.
 * Those jobs are missing isActive and source fields,
 * causing them to be invisible in the getAllJobs filter.
 *
 * Run once from backend folder:
 *   node scripts/migrateJobs.js
 *
 * Safe to run multiple times (only updates docs missing these fields).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Backfill isActive: true on all jobs that don't have it set
  const activeResult = await Job.updateMany(
    { isActive: { $exists: false } },
    { $set: { isActive: true } }
  );
  console.log(`isActive backfilled: ${activeResult.modifiedCount} jobs`);

  // Backfill source: 'internal' on all jobs missing source
  const sourceResult = await Job.updateMany(
    { source: { $exists: false } },
    { $set: { source: 'internal' } }
  );
  console.log(`source backfilled: ${sourceResult.modifiedCount} jobs`);

  // Backfill description: '' for jobs missing required description field
  const descResult = await Job.updateMany(
    { description: { $exists: false } },
    { $set: { description: '' } }
  );
  console.log(`description backfilled: ${descResult.modifiedCount} jobs`);

  // Report how many total jobs exist now
  const total = await Job.countDocuments();
  console.log(`Total jobs in DB: ${total}`);

  await mongoose.disconnect();
  console.log('Done. All jobs are now visible.');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
