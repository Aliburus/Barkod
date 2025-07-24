import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Product from "../models/Product";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");
  try {
    if (barcode) {
      const products = await Product.find({ barcode });
      return NextResponse.json(products);
    }
    const products = await Product.find();
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { barcode, name, price, stock, category, brand } = body;
    const product = new Product({
      barcode,
      name,
      price,
      stock,
      category,
      brand,
    });
    await product.save();
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
