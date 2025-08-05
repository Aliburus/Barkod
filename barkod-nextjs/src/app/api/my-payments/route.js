import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import MyPayment from "../models/MyPayment.js";
import MyDebt from "../models/MyDebt.js";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");
    const amountRange = searchParams.get("amountRange");
    const typeFilter = searchParams.get("typeFilter");

    let query = {};
    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Date filtering - optimized
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Search functionality - optimized
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { receiptNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Tutar aralığı filtresi
    if (amountRange && amountRange !== "all") {
      switch (amountRange) {
        case "low":
          query.amount = { $gte: 0, $lte: 1000 };
          break;
        case "medium":
          query.amount = { $gt: 1000, $lte: 10000 };
          break;
        case "high":
          query.amount = { $gt: 10000 };
          break;
      }
    }

    // Tip filtresi - sadece ödemeler
    if (typeFilter === "debt") {
      // Ödemeleri getirme, borçlar ayrı API'den gelecek
      return NextResponse.json({
        payments: [],
        hasMore: false,
        nextSkip: skip,
      });
    }

    // Build sort object - optimized
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Optimized query with lean() for better performance
    const myPayments = await MyPayment.find(query)
      .select(
        "_id vendorId vendorName amount paymentType description notes receiptNumber createdAt updatedAt"
      )
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean();

    // Check if there are more results - optimized
    const totalCount = await MyPayment.countDocuments(query);
    const hasMore = skip + limit < totalCount;
    const nextSkip = hasMore ? skip + limit : skip;

    return NextResponse.json({
      payments: myPayments,
      hasMore,
      nextSkip,
    });
  } catch (error) {
    console.error("My payments GET error:", error);
    return NextResponse.json(
      { error: "Ödemeler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const { vendorId, amount } = body;

    // Gerekli alanları kontrol et
    if (!vendorId) {
      return NextResponse.json({ error: "vendorId gerekli" }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Geçerli bir ödeme tutarı gerekli" },
        { status: 400 }
      );
    }

    // Tedarikçiye olan toplam borcu hesapla
    const totalDebt = await MyDebt.aggregate([
      { $match: { vendorId: vendorId } },
      { $group: { _id: null, totalDebt: { $sum: "$amount" } } },
    ]);

    const currentDebt = totalDebt.length > 0 ? totalDebt[0].totalDebt : 0;

    // Ödeme tutarı borçtan büyük olamaz
    if (amount > currentDebt) {
      return NextResponse.json(
        {
          error: `Ödeme tutarı borçtan büyük olamaz. Mevcut borç: ${currentDebt.toFixed(
            2
          )} ₺, Ödeme tutarı: ${amount.toFixed(2)} ₺`,
        },
        { status: 400 }
      );
    }

    const myPayment = new MyPayment({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await myPayment.save();

    return NextResponse.json(myPayment);
  } catch (error) {
    console.error("My payment POST error:", error);
    return NextResponse.json(
      { error: "Ödeme oluşturulurken hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}
