import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function clearCache() {
  await mongoose.connect(process.env.MONGODB_URI);
  const result = await mongoose.connection.db.collection('vehicleadvices').deleteMany({});
  console.log('Deleted:', result);
  process.exit(0);
}
clearCache();
