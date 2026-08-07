import mongoose from 'mongoose';

async function run() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://admin:LdO01jL8YfR1y0d8@cluster0.zox2d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection('vehicleadvices');
  
  const result = await collection.deleteMany({
    defect: "Detailed defect analysis pending."
  });
  console.log(`Deleted ${result.deletedCount} placeholder records.`);
  await mongoose.disconnect();
}

run().catch(console.dir);
