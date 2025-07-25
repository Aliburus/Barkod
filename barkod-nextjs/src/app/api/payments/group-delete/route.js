import { NextResponse } from "next/server";
import connectDB from "../../utils/db";
import Payment from "../../models/Payment";

export async function PATCH(request) {
  await connectDB();
  try {
    const filter = await request.json();
    const { status, ...rest } = filter;
    const result = await Payment.updateMany(rest, { status });
    return NextResponse.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
