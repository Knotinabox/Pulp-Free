import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectToDatabase from "@/lib/mongodb";
import SavedCar from "@/models/SavedCar";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vin, mileage } = await req.json();
    
    if (!vin || mileage === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Check if exists
    const existing = await SavedCar.findOne({ userId: (session.user as any).id, vin: vin });
    if (!existing) {
      return NextResponse.json({ error: "Car not found in garage" }, { status: 404 });
    }

    existing.mileage = Number(mileage);
    await existing.save();

    return NextResponse.json({ success: true, mileage: existing.mileage }, { status: 200 });
  } catch (error) {
    console.error("Error updating mileage:", error);
    return NextResponse.json({ error: "Failed to update mileage" }, { status: 500 });
  }
}
