import { NextResponse } from "next/server";
import connectDB from "../../../utils/db.js";
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

export async function DELETE(request, context) {
  await connectDB();
  try {
    const { barcode } = await context.params;
    console.log("DELETE endpoint çağrıldı, barcode:", barcode);

    // Önce bu barkod ile kaç satış var kontrol et
    const countBefore = await Sale.countDocuments({ barcode });
    console.log("Bu barkod ile satış sayısı:", countBefore);

    const result = await Sale.updateMany({ barcode }, { status: "deleted" });
    console.log("Güncellenen satış sayısı:", result.modifiedCount);

    return NextResponse.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    console.error("DELETE endpoint hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
