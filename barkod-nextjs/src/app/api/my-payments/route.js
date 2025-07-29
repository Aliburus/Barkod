import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import MyPayment from "../models/MyPayment.js";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");

    let query = {};
    if (vendorId) {
      query.vendorId = vendorId;
    }

    const myPayments = await MyPayment.find(query).sort({ createdAt: -1 }); // En yeni en başta

    return NextResponse.json(myPayments);
  } catch (error) {
    console.error("My payments GET error:", error);
    return NextResponse.json(
      { error: "Ödemeler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const myPayment = new MyPayment({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await myPayment.save();

    return NextResponse.json(myPayment);
  } catch (error) {
    console.error("My payment POST error:", error);
    return NextResponse.json(
      { error: "Ödeme oluşturulurken hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}
