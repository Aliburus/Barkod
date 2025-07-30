import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import SubCustomer from "../models/SubCustomer";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = parseInt(searchParams.get("skip") || "0");

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

  // SubCustomer'ları getir (infinite scroll için)
  const subCustomers = await SubCustomer.find(query)
    .populate("customerId", "name phone")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // createdAt boş olan subcustomer'ları güncelle
  for (const subCustomer of subCustomers) {
    if (!subCustomer.createdAt) {
      await SubCustomer.findByIdAndUpdate(subCustomer._id, {
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      subCustomer.createdAt = new Date();
      subCustomer.updatedAt = new Date();
    }
  }

  // Daha fazla alt müşteri var mı kontrol et
  const hasMore = subCustomers.length === limit;

  return NextResponse.json({
    subCustomers,
    hasMore,
    nextSkip: skip + limit,
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
    // --- KAPALI HESAP AÇILAMAZ ---
    const subCustomer = await SubCustomer.findById(id);
    if (subCustomer && subCustomer.status === "inactive") {
      return NextResponse.json(
        { error: "Kapanan hesap tekrar açılamaz." },
        { status: 400 }
      );
    }
    update.status = "active";
  }

  const updatedSubCustomer = await SubCustomer.findByIdAndUpdate(id, update, {
    new: true,
  }).populate("customerId", "name phone");

  return NextResponse.json(updatedSubCustomer);
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
