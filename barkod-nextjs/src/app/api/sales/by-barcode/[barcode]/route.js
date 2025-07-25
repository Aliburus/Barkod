import { NextResponse } from "next/server";
import connectDB from "../../../utils/db";
import Sale from "../../../models/Sale";

export async function PATCH(request, context) {
  await connectDB();
  try {
    const { barcode } = await context.params;
    const update = await request.json();
    const result = await Sale.updateMany({ barcode }, update);
    return NextResponse.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
