import { NextResponse } from "next/server";
import connectDB from "../../utils/db";
import Customer from "../../models/Customer";

export async function DELETE(request, context) {
  await connectDB();
  try {
    const { id } = await context.params;
    const deleted = await Customer.findOneAndDelete({ _id: id });
    if (!deleted)
      return NextResponse.json(
        { error: "Müşteri bulunamadı" },
        { status: 404 }
      );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
