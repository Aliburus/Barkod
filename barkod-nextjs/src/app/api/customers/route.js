import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Customer from "../models/Customer";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

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

  // Toplam sayıyı al
  const total = await Customer.countDocuments(query);

  // Müşterileri getir (pagination ile)
  const customers = await Customer.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(); // lean() ile performans artışı

  return NextResponse.json({
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
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
