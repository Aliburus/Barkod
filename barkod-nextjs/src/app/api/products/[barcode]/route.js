import { NextResponse } from "next/server";
import connectDB from "../../utils/db.js";
import Product from "../../models/Product";

export async function GET(request, { params }) {
  await connectDB();
  try {
    const { barcode } = await params;
    const product = await Product.findOne({ barcode });
    if (!product)
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  await connectDB();
  const params = await context.params;
  try {
    const body = await request.json();
    const updated = await Product.findOneAndUpdate(
      { barcode: params.barcode },
      body,
      { new: true }
    );
    if (!updated)
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, context) {
  await connectDB();
  const params = await context.params;
  try {
    const deleted = await Product.findOneAndDelete({ barcode: params.barcode });
    if (!deleted)
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
