import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME

if (!MONGODB_URI && process.env.NODE_ENV !== 'test') {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

if (!MONGODB_DB_NAME && process.env.NODE_ENV !== 'test') {
    throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env.local');
  }


/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (global as any).mongoose

if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: MONGODB_DB_NAME,
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}
