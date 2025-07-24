import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Sale from "../models/Sale";
import Product from "../models/Product";

export async function GET() {
  await connectDB();
  try {
    const sales = await Sale.find();
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { barcode, quantity, soldAt, price, productName } = body;
    const product = await Product.findOne({ barcode });
    if (!product)
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    if (product.stock < quantity)
      return NextResponse.json({ error: "Yeterli stok yok" }, { status: 400 });
    product.stock -= quantity;
    await product.save();
    const sale = new Sale({ barcode, quantity, soldAt, price, productName });
    await sale.save();
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
