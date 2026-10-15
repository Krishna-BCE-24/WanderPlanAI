import mongoose from 'mongoose';

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI is missing from server/.env');
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    });

    console.log('MongoDB Atlas connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);

    const servers = error.reason?.servers;

    if (servers instanceof Map) {
      for (const [address, server] of servers) {
        console.error(`\nServer: ${address}`);
        console.error(`State: ${server.type}`);

        if (server.error) {
          console.error('Underlying error:', server.error.message);
        }
      }
    }

    throw error;
  }
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
