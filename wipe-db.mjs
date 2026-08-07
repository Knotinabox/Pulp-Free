import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function wipe() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env.local');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.some(c => c.name === 'vehicleadvices')) {
      await db.dropCollection('vehicleadvices');
      console.log('Successfully wiped the vehicleadvices collection.');
    } else {
      console.log('Collection vehicleadvices does not exist yet. Nothing to wipe.');
    }
  } catch (error) {
    console.error('Error wiping database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

wipe();
