import { NextResponse } from "next/server";
import connectDB from "../../utils/db";
import Payment from "../../models/Payment";

export async function DELETE(request, context) {
  await connectDB();
  try {
    const { id } = await context.params;
    const deleted = await Payment.findOneAndDelete({ _id: id });
    if (!deleted)
      return NextResponse.json({ error: "Ödeme bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request, context) {
  await connectDB();
  try {
    const { id } = await context.params;
    const update = await request.json();
    const result = await Payment.findByIdAndUpdate(id, update, { new: true });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
