import { NextResponse } from "next/server";
import connectDB from "../utils/db";

export async function GET(request) {
  try {
    await connectDB();

    // Placeholder response since models don't exist yet
    return NextResponse.json([]);
  } catch (error) {
    console.error("Vendor payments GET error:", error);
    return NextResponse.json(
      { error: "Tedarikçi ödemeleri yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    // Placeholder response since models don't exist yet
    return NextResponse.json({
      _id: "placeholder",
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Vendor payment POST error:", error);
    return NextResponse.json(
      { error: "Tedarikçi ödemesi eklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
