import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectToDatabase from "@/lib/mongodb";
import SavedCar from "@/models/SavedCar";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { decodeVIN } from "@/utils/nhtsa";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !(session.user as any).id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { vin, mileage } = await req.json();
    
    if (!vin || vin.length !== 17) {
      return NextResponse.json({ error: "Invalid VIN" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Check if already exists
    const existing = await SavedCar.findOne({ userId: (session.user as any).id, vin: vin });
    if (existing) {
      return NextResponse.json({ error: "Car already in garage" }, { status: 400 });
    }

    // Check garage limit
    const count = await SavedCar.countDocuments({ userId: (session.user as any).id });
    if (count >= 10) {
      return NextResponse.json({ error: "Garage full (Max 10 cars)" }, { status: 400 });
    }

    // Decode the VIN
    const decoded = await decodeVIN(vin);
    
    if (!decoded || decoded.make === 'Unknown' || decoded.model === 'Unknown') {
      return NextResponse.json({ error: "Could not identify vehicle from VIN" }, { status: 400 });
    }

    // Create a personal vehicle record
    const savedCar = await SavedCar.create({
      userId: (session.user as any).id,
      vin: vin,
      year: parseInt(decoded.year) || new Date().getFullYear(),
      make: decoded.make,
      model: decoded.model,
      price: 0,
      mileage: Number(mileage) || 0,
      location: "Personal Vehicle",
      image: "", 
      url: "",
      score: undefined
    });

    return NextResponse.json({ success: true, savedCar }, { status: 201 });
  } catch (error) {
    console.error("Error adding personal car by VIN:", error);
    return NextResponse.json({ error: "Failed to save car" }, { status: 500 });
  }
}
