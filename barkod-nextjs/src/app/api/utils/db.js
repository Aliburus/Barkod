import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGO_URI environment variable inside .env.local"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 10000, // Keep trying to send operations for 10 seconds
      socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      maxIdleTimeMS: 45000, // Close connections after 45 seconds of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;

// Graceful shutdown
process.on("SIGINT", async () => {
  if (cached.conn) {
    await cached.conn.disconnect();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (cached.conn) {
    await cached.conn.disconnect();
  }
  process.exit(0);
});
