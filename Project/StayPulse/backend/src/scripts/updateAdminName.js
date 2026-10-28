import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function updateAdminDisplayName() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staypulse';
  console.log(`[Script] Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Update the primary seeded demo admin: admin@staypulse.com
  const updateDemoResult = await db.collection('users').updateOne(
    { email: 'admin@staypulse.com' },
    { $set: { name: 'Sachin Yaduwanshi' } }
  );
  console.log(`[Script] Updated admin@staypulse.com: matched ${updateDemoResult.matchedCount}, modified ${updateDemoResult.modifiedCount}`);

  // 2. Also ensure any other PLATFORM_ADMIN account has name 'Sachin Yaduwanshi'
  const updateAllResult = await db.collection('users').updateMany(
    { role: 'PLATFORM_ADMIN' },
    { $set: { name: 'Sachin Yaduwanshi' } }
  );
  console.log(`[Script] Updated all PLATFORM_ADMIN accounts: matched ${updateAllResult.matchedCount}, modified ${updateAllResult.modifiedCount}`);

  // 3. Verify the updated state
  const admins = await db.collection('users').find({ role: 'PLATFORM_ADMIN' }, { projection: { name: 1, email: 1, role: 1, status: 1 } }).toArray();
  console.log('[Script] Current PLATFORM_ADMIN records in database:', admins);

  await mongoose.disconnect();
  console.log('[Script] Finished successfully and disconnected.');
}

updateAdminDisplayName().catch((err) => {
  console.error('[Script Error]', err);
  process.exit(1);
});
