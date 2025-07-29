import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Customer from "../models/Customer";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = parseInt(searchParams.get("skip") || "0");

  let query = {};
  if (search && search.trim()) {
    query = {
      $or: [
        { name: { $regex: search.trim(), $options: "i" } },
        { phone: { $regex: search.trim(), $options: "i" } },
        { address: { $regex: search.trim(), $options: "i" } },
      ],
    };
  }

  // Müşterileri getir (infinite scroll için)
  const customers = await Customer.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // lean() ile performans artışı

  // Daha fazla müşteri var mı kontrol et
  const hasMore = customers.length === limit;

  return NextResponse.json({
    customers,
    hasMore,
    nextSkip: skip + limit,
  });
}

export async function POST(req) {
  await connectDB();
  const data = await req.json();
  const customer = await Customer.create(data);
  return NextResponse.json(customer);
}

export async function PATCH(req) {
  await connectDB();
  const { id, ...update } = await req.json();
  const customer = await Customer.findByIdAndUpdate(id, update, { new: true });
  return NextResponse.json(customer);
}
