import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import MyDebt from "../models/MyDebt.js";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");

    let query = {};
    if (vendorId) {
      query.vendorId = vendorId;
    }

    const myDebts = await MyDebt.find(query).sort({ createdAt: -1 }); // En yeni en başta

    return NextResponse.json(myDebts);
  } catch (error) {
    console.error("My debts GET error:", error);
    return NextResponse.json(
      { error: "Borçlar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const myDebt = new MyDebt({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await myDebt.save();

    return NextResponse.json(myDebt);
  } catch (error) {
    console.error("My debt POST error:", error);
    return NextResponse.json(
      { error: "Borç oluşturulurken hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}
