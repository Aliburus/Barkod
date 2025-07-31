import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
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
        { productBarcodes: { $in: [new RegExp(search, "i")] } },
        { "productDetails.productName": { $regex: search, $options: "i" } },
        { "productDetails.barcode": { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object - optimized
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Optimized query with lean() for better performance
    const myDebts = await MyDebt.find(query)
      .select(
        "_id vendorId vendorName amount description notes dueDate isPaid createdAt updatedAt"
      )
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean();

    // Check if there are more results - optimized
    const totalCount = await MyDebt.countDocuments(query);
    const hasMore = skip + limit < totalCount;
    const nextSkip = hasMore ? skip + limit : skip;

    return NextResponse.json({
      debts: myDebts,
      hasMore,
      nextSkip,
    });
  } catch (error) {
    console.error("My debts GET error:", error);
    return NextResponse.json(
      { error: "Borçlar yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    const myDebt = new MyDebt({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await myDebt.save();

    return NextResponse.json(myDebt);
  } catch (error) {
    console.error("My debt POST error:", error);
    return NextResponse.json(
      { error: "Borç oluşturulurken hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}
