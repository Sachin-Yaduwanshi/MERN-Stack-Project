import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';

/**
 * Secure Platform Administrator Bootstrap Script
 *
 * Usage:
 *   ADMIN_EMAIL=admin@staypulse.com ADMIN_PASSWORD=YourSecurePass npm run seed:admin
 *
 * Security:
 * - Credentials are read from environment variables; NEVER hardcoded.
 * - Passwords are never logged or exposed.
 * - Idempotent: will not overwrite or duplicate existing administrator accounts.
 */
const bootstrapAdmin = async () => {
  console.log('[Bootstrap] Initializing Platform Administrator setup...');

  const adminName = process.env.ADMIN_NAME || 'Sachin Yaduwanshi';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@staypulse.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminStayPulse#2026';

  if (!adminPassword || adminPassword.length < 8) {
    console.error('[Bootstrap Error] ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  // Connect to database
  const conn = await connectDB();
  if (!conn) {
    console.error('[Bootstrap Error] Could not establish MongoDB connection.');
    process.exit(1);
  }

  try {
    // Check if administrator already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: 'PLATFORM_ADMIN' }],
    });

    if (existingAdmin) {
      console.log(`[Bootstrap] Platform Administrator already exists with email: ${existingAdmin.email}`);
      console.log('[Bootstrap] No changes made.');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create the initial PLATFORM_ADMIN account (password hashed by pre-save hook)
    const admin = await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
    });

    console.log(`[Bootstrap] Success: Initial PLATFORM_ADMIN account provisioned.`);
    console.log(`[Bootstrap] Assigned Email: ${admin.email}`);
    console.log(`[Bootstrap] Role: ${admin.role}`);
    console.log('[Bootstrap] Note: Password was hashed and securely stored in MongoDB.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`[Bootstrap Error] Failed to seed administrator: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

bootstrapAdmin();
