import { NextResponse } from "next/server";
import connectDB from "../../../utils/db.js";
import SaleItem from "../../../models/SaleItem";
import mongoose from "mongoose";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { customerId } = await params;

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const subCustomerId = searchParams.get("subCustomerId")?.trim();
    const search = searchParams.get("search")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    // customerId'nin geçerli olup olmadığını kontrol et
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { error: "Geçersiz müşteri ID'si" },
        { status: 400 }
      );
    }

    // Sorgu oluştur
    const query = { customerId };

    if (subCustomerId) {
      query.subCustomerId = subCustomerId;
    }

    if (search) {
      query.$or = [
        { barcode: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
      ];
    }

    // Tarih filtreleme
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Sale items'ları getir
    const saleItems = await SaleItem.find(query)
      .populate("saleId", "totalAmount createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      saleItems,
      totalCount: saleItems.length,
      customerId,
      subCustomerId,
      search,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Müşteri satış verileri getirme hatası:", error);
    return NextResponse.json(
      { error: "Müşteri satış verileri getirilemedi" },
      { status: 500 }
    );
  }
}
