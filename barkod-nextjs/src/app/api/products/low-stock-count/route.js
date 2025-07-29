import { NextResponse } from "next/server";
import connectDB from "../../utils/db.js";
import Product from "../../models/Product.js";

export async function GET() {
  await connectDB();

  try {
    // Stok seviyesi 5 ve altında olan ürünlerin sayısını al
    const lowStockCount = await Product.countDocuments({
      stock: { $lte: 5, $gt: 0 },
    });

    return NextResponse.json({ lowStockCount });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
