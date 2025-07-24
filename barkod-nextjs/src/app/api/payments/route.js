import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Payment from "../models/Payment";

export async function GET() {
  await connectDB();
  try {
    const payments = await Payment.find().sort({ date: -1 });
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const payment = new Payment(body);
    await payment.save();
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
