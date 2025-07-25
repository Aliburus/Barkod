import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Sale from "../models/Sale";
import Product from "../models/Product";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit")) || 20;
  const skip = parseInt(searchParams.get("skip")) || 0;
  const search = searchParams.get("search");
  try {
    let query = {};
    if (search) {
      query = {
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { barcode: { $regex: search, $options: "i" } },
        ],
      };
    }
    const sales = await Sale.find(query).skip(skip).limit(limit);
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const {
      barcode,
      quantity,
      soldAt,
      price,
      productName,
      customer,
      paymentType,
    } = body;
    const product = await Product.findOne({ barcode });
    if (!product)
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    if (product.stock < quantity)
      return NextResponse.json({ error: "Yeterli stok yok" }, { status: 400 });
    product.stock -= quantity;
    await product.save();
    const sale = new Sale({
      barcode,
      quantity,
      soldAt,
      price,
      productName,
      customer,
      paymentType,
    });
    await sale.save();
    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const sale = await Sale.findByIdAndUpdate(id, updates, { new: true });
    if (!sale)
      return NextResponse.json({ error: "Satış bulunamadı" }, { status: 404 });
    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
