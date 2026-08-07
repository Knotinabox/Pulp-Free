import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import VehicleAdvice from '@/models/VehicleAdvice';

export async function GET() {
  try {
    await connectToDatabase();
    await VehicleAdvice.deleteMany({});
    return NextResponse.json({ message: 'Database collection vehicleadvices completely wiped.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
