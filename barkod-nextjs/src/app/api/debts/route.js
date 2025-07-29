import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Debt from "../models/Debt";

// Tüm borçları getir
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    // Query parametreleri
    const vendorId = searchParams.get("vendorId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "50");
    const typeFilter = searchParams.get("typeFilter");
    const amountRange = searchParams.get("amountRange");

    // Filtreleme objesi oluştur
    const filter = {};

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (search) {
      filter.$or = [
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    // Tutar aralığı filtresi
    if (amountRange && amountRange !== "all") {
      switch (amountRange) {
        case "low":
          filter.amount = { $gte: 0, $lte: 1000 };
          break;
        case "medium":
          filter.amount = { $gt: 1000, $lte: 10000 };
          break;
        case "high":
          filter.amount = { $gt: 10000 };
          break;
      }
    }

    // Tip filtresi - sadece borçlar
    if (typeFilter === "debt") {
      // Sadece borçları getir
    } else if (typeFilter === "payment") {
      // Borçları getirme, ödemeler ayrı API'den gelecek
      return NextResponse.json({
        debts: [],
        hasMore: false,
        nextSkip: skip,
        total: 0,
      });
    }

    // Sıralama
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const debts = await Debt.find(filter)
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "subCustomerId",
        select: "name phone",
        strictPopulate: false,
      })
      .populate("saleId")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Debt.countDocuments(filter);
    const hasMore = skip + limit < total;

    return NextResponse.json({
      debts,
      hasMore,
      nextSkip: skip + limit,
      total,
    });
  } catch (error) {
    console.error("Borç getirme hatası:", error);
    return NextResponse.json(
      { error: "Borçlar getirilemedi" },
      { status: 500 }
    );
  }
}

// Yeni borç ekle
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const debt = new Debt(body);
    await debt.save();

    const populatedDebt = await Debt.findById(debt._id)
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "subCustomerId",
        select: "name phone",
        strictPopulate: false,
      })
      .populate("saleId");

    return NextResponse.json(populatedDebt, { status: 201 });
  } catch (error) {
    console.error("Borç ekleme hatası:", error);
    return NextResponse.json({ error: "Borç eklenemedi" }, { status: 500 });
  }
}

// Borç sil
export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get("id");

    if (!debtId) {
      return NextResponse.json(
        { error: "Borç ID'si gerekli" },
        { status: 400 }
      );
    }

    const deletedDebt = await Debt.findByIdAndDelete(debtId);

    if (!deletedDebt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ message: "Borç başarıyla silindi" });
  } catch (error) {
    console.error("Borç silme hatası:", error);
    return NextResponse.json({ error: "Borç silinemedi" }, { status: 500 });
  }
}
