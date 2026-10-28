import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB using Mongoose.
 * Logs connection status and provides diagnostic details if the database service is unavailable.
 */
export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/staypulse';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
    });

    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB at ${uri}: ${error.message}`);
    console.warn(`[Database Notice] Please ensure MongoDB service is running locally on port 27017 or provide a valid MONGODB_URI in backend/.env`);
    return null;
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB connection disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Database Error] Runtime connection error: ${err.message}`);
});
