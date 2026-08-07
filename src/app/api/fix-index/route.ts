import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import VehicleAdvice from '@/models/VehicleAdvice';

const MONGODB_URI = process.env.MONGODB_URI!;

export async function GET() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGODB_URI);
    }
    
    // Wipe the entire vehicle advices collection
    const result = await VehicleAdvice.deleteMany({});

    return NextResponse.json({ success: true, message: `Database wiped successfully. Deleted ${result.deletedCount} documents.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
