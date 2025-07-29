import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Product from "../models/Product";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const barcode = searchParams.get("barcode");
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const vendor = searchParams.get("vendor");
  const brand = searchParams.get("brand");
  const tool = searchParams.get("tool");
  const stockFilter = searchParams.get("stockFilter");
  const sortBy = searchParams.get("sortBy") || "name";
  const sortOrder = searchParams.get("sortOrder") || "asc";

  try {
    if (barcode) {
      const products = await Product.find({ barcode });
      return NextResponse.json(products);
    }

    let query = {};

    // Arama filtresi
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    // Kategori filtresi
    if (category) {
      query.category = category;
    }

    // Tedarikçi filtresi
    if (vendor) {
      query.supplier = { $in: [vendor] };
    }

    // Marka filtresi
    if (brand) {
      query.brand = brand;
    }

    // Kullanılan araç filtresi
    if (tool) {
      query.usedCars = { $regex: tool, $options: "i" };
    }

    // Stok filtresi
    if (stockFilter === "low") {
      query.stock = { $lte: 5, $gt: 0 };
    } else if (stockFilter === "out") {
      query.stock = 0;
    }

    // Sıralama
    let sortQuery = {};
    sortQuery[sortBy] = sortOrder === "asc" ? 1 : -1;

    const products = await Product.find(query).sort(sortQuery);
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
