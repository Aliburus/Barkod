import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";

export async function GET() {
  try {
    await connectDB();

    // Placeholder response since models don't exist yet
    return NextResponse.json([]);
  } catch (error) {
    console.error("Vendor debts GET error:", error);
    return NextResponse.json(
      { error: "Tedarikçi borçları yüklenirken hata oluştu" },
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
    console.error("Vendor debt POST error:", error);
    return NextResponse.json(
      { error: "Tedarikçi borcu eklenirken hata oluştu" },
      { status: 500 }
    );
  }
}
