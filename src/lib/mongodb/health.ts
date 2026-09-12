import { connectToDatabase } from './client'

export async function checkMongoHealth(): Promise<{ status: string; message?: string }> {
  try {
    const mongoose = await connectToDatabase()
    
    // Check if readyState is 1 (connected)
    if (mongoose.connection.readyState === 1) {
      return { status: 'ok', message: 'Successfully connected to MongoDB' }
    }
    
    return { status: 'error', message: `MongoDB connection not ready (state: ${mongoose.connection.readyState})` }
  } catch (error) {
    // Log the error for internal server logs but do not leak connection details
    console.error('MongoDB Health Check Failed:', error instanceof Error ? error.message : String(error))
    return { status: 'error', message: 'Failed to connect to MongoDB' }
  }
}
