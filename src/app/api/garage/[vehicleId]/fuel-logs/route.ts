import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectToDatabase from "@/lib/mongodb";
import FuelLog from "@/models/FuelLog";
import SavedCar from "@/models/SavedCar";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Await params per Next.js 15 route context changes if applicable,
  // but standard Next.js 14 uses `params.vehicleId` directly.
  const { vehicleId } = await params;

  try {
    await connectToDatabase();
    
    // Verify the car belongs to the user
    const car = await SavedCar.findOne({ _id: vehicleId, userId: (session.user as any).id });
    if (!car) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const logs = await FuelLog.find({ vehicleId }).sort({ loggedAt: -1 });
    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch fuel logs" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { vehicleId } = await params;

  try {
    const data = await req.json();
    await connectToDatabase();

    // Verify the car belongs to the user
    const car = await SavedCar.findOne({ _id: vehicleId, userId: (session.user as any).id });
    if (!car) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    const newLog = await FuelLog.create({
      vehicleId,
      ...data,
    });

    return NextResponse.json({ success: true, log: newLog }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create fuel log" }, { status: 500 });
  }
}
