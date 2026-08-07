import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import VehicleAdvice from '@/models/VehicleAdvice';

const MONGODB_URI = process.env.MONGODB_URI!;

export async function GET() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }
    
    // Attempt to drop the old index
    try {
      await VehicleAdvice.collection.dropIndex("year_1_make_1_model_1");
    } catch (e: any) {
      console.log("Index might not exist or already dropped:", e.message);
    }
    
    // Sync to create the new one defined in the schema
    await VehicleAdvice.syncIndexes();

    return NextResponse.json({ success: true, message: "Index dropped and synced successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
