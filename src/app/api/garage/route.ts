import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectToDatabase from "@/lib/mongodb";
import SavedCar from "@/models/SavedCar";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    const cars = await SavedCar.find({ userId: (session.user as any).id }).sort({ createdAt: -1 });
    return NextResponse.json({ cars });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch saved cars" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();
    await connectToDatabase();
    
    // Check if already exists
    const existing = await SavedCar.findOne({ userId: (session.user as any).id, vin: data.vin });
    if (existing) {
      return NextResponse.json({ error: "Car already saved" }, { status: 400 });
    }

    const savedCar = await SavedCar.create({
      userId: (session.user as any).id,
      ...data
    });

    return NextResponse.json({ success: true, savedCar }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save car" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession();
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const vin = searchParams.get('vin');
    
    if (!vin) {
      return NextResponse.json({ error: "VIN required" }, { status: 400 });
    }

    await connectToDatabase();
    await SavedCar.deleteOne({ userId: (session.user as any).id, vin });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete car" }, { status: 500 });
  }
}
