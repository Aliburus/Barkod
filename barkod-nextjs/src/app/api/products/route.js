import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Product from "../models/Product";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");
  const limit = parseInt(searchParams.get("limit")) || 20;
  const skip = parseInt(searchParams.get("skip")) || 0;
  const search = searchParams.get("search");
  try {
    if (barcode) {
      const products = await Product.find({ barcode });
      return NextResponse.json(products);
    }
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { barcode: { $regex: search, $options: "i" } },
          { brand: { $regex: search, $options: "i" } },
        ],
      };
    }
    const products = await Product.find(query).skip(skip).limit(limit);
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { barcode, name, price, stock, category, brand, purchasePrice } =
      body;
    const product = new Product({
      barcode,
      name,
      price,
      stock,
      category,
      brand,
      purchasePrice,
    });
    await product.save();
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
