import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Product from "../models/Product.js";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const vendor = searchParams.get("vendor");
    const brand = searchParams.get("brand");
    const tool = searchParams.get("tool");
    const stockFilter = searchParams.get("stockFilter");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    let query = {};

    // Search functionality - optimized with index support
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by category
    if (category && category !== "all") {
      query.category = category;
    }

    // Filter by vendor
    if (vendor && vendor !== "all") {
      query.supplier = vendor;
    }

    // Filter by brand
    if (brand && brand !== "all") {
      query.brand = brand;
    }

    // Filter by tool
    if (tool && tool !== "all") {
      query.tool = tool;
    }

    // Stock filtering
    if (stockFilter) {
      switch (stockFilter) {
        case "inStock":
          query.stock = { $gt: 0 };
          break;
        case "outOfStock":
          query.stock = 0;
          break;
        case "lowStock":
          query.stock = { $lte: 5, $gt: 0 };
          break;
        case "criticalStock":
          query.stock = { $lte: 2, $gt: 0 };
          break;
      }
    }

    // Build sort object - optimized for common cases
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Optimized query with projection for better performance
    const products = await Product.find(query)
      .select(
        "_id barcode name price stock category brand supplier shelf tool purchasePrice createdAt updatedAt"
      )
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    // Check if there are more results - optimized count
    const totalCount = await Product.countDocuments(query);
    const hasMore = skip + limit < totalCount;
    const nextSkip = hasMore ? skip + limit : skip;

    // Create response with caching headers
    const response = NextResponse.json({
      products,
      hasMore,
      nextSkip,
      totalCount,
    });

    // Add cache headers for better performance
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, stale-while-revalidate=60"
    );
    response.headers.set("X-Total-Count", totalCount.toString());
    response.headers.set("X-Has-More", hasMore.toString());

    return response;
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { error: "Ürünler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { id, stock } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Ürün ID'si gerekli" },
        { status: 400 }
      );
    }

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    // Stok güncelleme
    if (stock !== undefined) {
      product.stock = stock;
    }

    await product.save();
    return NextResponse.json(product);
  } catch (error) {
    console.error("Product PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    console.log("POST gelen body:", body);
    const {
      barcode,
      name,
      price,
      stock,
      category,
      brand,
      purchasePrice,
      supplier,
      oem,
      kod1,
      kod2,
      usedCars,
    } = body;
    console.log("POST gelen supplier:", supplier);
    let supplierArr = supplier;
    if (typeof supplier === "string") {
      supplierArr = [supplier];
    }
    if (!Array.isArray(supplierArr)) {
      supplierArr = [];
    }
    const product = new Product({
      barcode,
      name,
      price,
      stock,
      category,
      brand,
      purchasePrice,
      supplier: supplierArr,
      oem,
      kod1,
      kod2,
      usedCars,
    });
    await product.save();
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
