import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import SubCustomer from "../models/SubCustomer";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = (page - 1) * limit;

  let query = {};

  if (customerId) {
    query.customerId = customerId;
  }

  // Sadece silinmemiş olanları getir (active ve inactive)
  query.status = { $ne: "deleted" };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  // Toplam sayıyı al
  const total = await SubCustomer.countDocuments(query);

  // SubCustomer'ları getir (pagination ile)
  const subCustomers = await SubCustomer.find(query)
    .populate("customerId", "name phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return NextResponse.json({
    subCustomers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request) {
  await connectDB();
  const data = await request.json();

  const subCustomer = await SubCustomer.create(data);

  // Populate ile müşteri bilgilerini getir
  const populatedSubCustomer = await SubCustomer.findById(
    subCustomer._id
  ).populate("customerId", "name phone");

  return NextResponse.json(populatedSubCustomer);
}

export async function PATCH(request) {
  await connectDB();
  const { id, ...update } = await request.json();
  update.updatedAt = new Date();

  // Hesap kapatma işlemi için özel kontrol
  if (update.status === "inactive") {
    // Hesabı kapatırken status'u inactive yap
    update.status = "inactive";
  } else if (update.status === "active") {
    // Hesabı açarken status'u active yap
    update.status = "active";
  }

  const subCustomer = await SubCustomer.findByIdAndUpdate(id, update, {
    new: true,
  }).populate("customerId", "name phone");

  return NextResponse.json(subCustomer);
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    // Soft delete - status'u deleted yap
    await SubCustomer.findByIdAndUpdate(id, { status: "deleted" });
  }

  return NextResponse.json({ success: true });
}
