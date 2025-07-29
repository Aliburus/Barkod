import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import CustomerPayment from "../models/CustomerPayment";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const limit = parseInt(searchParams.get("limit") || "50");
  const skip = parseInt(searchParams.get("skip") || "0");

  let query = { status: "active" };

  if (customerId) {
    query.customerId = customerId;
  }

  if (startDate && endDate) {
    query.paymentDate = {
      $gte: new Date(startDate),
      $lte: new Date(endDate + "T23:59:59"),
    };
  }

  // Ödemeleri getir (infinite scroll için)
  const payments = await CustomerPayment.find(query)
    .populate({ path: "customerId", select: "name phone" })
    .populate({ path: "debtId", select: "amount description" })
    .populate({ path: "saleId", select: "totalAmount items" })
    .sort({ paymentDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // Daha fazla ödeme var mı kontrol et
  const hasMore = payments.length === limit;

  return NextResponse.json({
    payments,
    hasMore,
    nextSkip: skip + limit,
  });
}

export async function POST(request) {
  await connectDB();
  const data = await request.json();

  // Ödeme tarihi yoksa şu anki tarihi kullan
  if (!data.paymentDate) {
    data.paymentDate = new Date();
  }

  // subCustomerId'yi de kaydet
  const payment = await CustomerPayment.create({
    ...data,
    subCustomerId: data.subCustomerId || undefined,
  });

  // Populate ile müşteri bilgilerini getir
  const populatedPayment = await CustomerPayment.findById(payment._id)
    .populate({ path: "customerId", select: "name phone" })
    .populate({ path: "debtId", select: "amount description" })
    .populate({ path: "saleId", select: "totalAmount items" });

  return NextResponse.json(populatedPayment);
}

export async function PATCH(request) {
  await connectDB();
  const { id, ...update } = await request.json();
  update.updatedAt = new Date();

  const payment = await CustomerPayment.findByIdAndUpdate(id, update, {
    new: true,
  })
    .populate({ path: "customerId", select: "name phone" })
    .populate({ path: "debtId", select: "amount description" })
    .populate({ path: "saleId", select: "totalAmount items" });

  return NextResponse.json(payment);
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    // Soft delete - status'u cancelled yap
    await CustomerPayment.findByIdAndUpdate(id, { status: "cancelled" });
  }

  return NextResponse.json({ success: true });
}
