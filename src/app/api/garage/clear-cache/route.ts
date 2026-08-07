import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import VehicleAdvice from '@/models/VehicleAdvice';
import OwnershipAdvice from '@/models/OwnershipAdvice';

export async function GET() {
  try {
    await connectToDatabase();
    await VehicleAdvice.deleteMany({});
    await OwnershipAdvice.deleteMany({});
    return NextResponse.json({ success: true, message: 'Caches cleared' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
