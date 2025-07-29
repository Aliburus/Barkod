import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import SaleItem from "../models/SaleItem";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const saleId = searchParams.get("saleId");
    const customerId = searchParams.get("customerId");
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit")) || 100;
    const skip = parseInt(searchParams.get("skip")) || 0;

    let query = {};

    if (saleId) query.saleId = saleId;
    if (customerId) query.customerId = customerId;
    if (productId) query.productId = productId;

    const saleItems = await SaleItem.find(query)
      .populate("customerId", "name phone")
      .populate("subCustomerId", "name phone")
      .populate("productId", "name barcode price")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return NextResponse.json(saleItems);
  } catch (error) {
    console.error("Sale items getirme hatası:", error);
    return NextResponse.json(
      { error: "Sale items getirilemedi" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const saleItems = [];

    // Birden fazla sale item oluştur
    for (const item of body.items) {
      const saleItem = new SaleItem({
        saleId: body.saleId,
        productId: item.productId,
        barcode: item.barcode,
        productName: item.productName,
        quantity: item.quantity,
        originalPrice: item.originalPrice,
        customPrice: item.customPrice,
        finalPrice: item.finalPrice,
        totalAmount: item.totalAmount,
        customerId: body.customerId,
        subCustomerId: body.subCustomerId,
      });

      saleItems.push(saleItem);
    }

    const savedItems = await SaleItem.insertMany(saleItems);

    return NextResponse.json(savedItems);
  } catch (error) {
    console.error("Sale items oluşturma hatası:", error);
    return NextResponse.json(
      { error: "Sale items oluşturulamadı" },
      { status: 500 }
    );
  }
}
