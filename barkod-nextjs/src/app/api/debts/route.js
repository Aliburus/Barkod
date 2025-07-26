import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Debt from "../models/Debt";

// Tüm borçları getir
export async function GET() {
  try {
    await connectDB();
    const debts = await Debt.find()
      .populate("customerId", "name phone")
      .populate("saleId")
      .sort({ createdAt: -1 });

    return NextResponse.json(debts);
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
      .populate("customerId", "name phone")
      .populate("saleId");

    return NextResponse.json(populatedDebt, { status: 201 });
  } catch (error) {
    console.error("Borç ekleme hatası:", error);
    return NextResponse.json({ error: "Borç eklenemedi" }, { status: 500 });
  }
}
