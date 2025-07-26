import { NextResponse } from "next/server";
import connectDB from "../../../utils/db";
import Debt from "../../../models/Debt";

// Müşterinin borçlarını getir
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { customerId } = await params;
    const debts = await Debt.find({ customerId })
      .populate("saleId", "totalAmount createdAt")
      .sort({ createdAt: -1 });

    // Toplam borç hesaplama
    const totalDebt = debts.reduce((sum, debt) => {
      return sum + (debt.amount - debt.paidAmount);
    }, 0);

    return NextResponse.json({
      debts,
      totalDebt,
      totalDebts: debts.length,
    });
  } catch (error) {
    console.error("Müşteri borç getirme hatası:", error);
    return NextResponse.json(
      { error: "Müşteri borçları getirilemedi" },
      { status: 500 }
    );
  }
}

// Müşteriye yeni borç ekle
export async function POST(request, { params }) {
  try {
    await connectDB();
    const { customerId } = await params;
    const body = await request.json();

    const debt = new Debt({
      ...body,
      customerId,
    });
    await debt.save();

    const populatedDebt = await Debt.findById(debt._id).populate(
      "saleId",
      "totalAmount createdAt"
    );

    return NextResponse.json(populatedDebt, { status: 201 });
  } catch (error) {
    console.error("Müşteri borç ekleme hatası:", error);
    return NextResponse.json(
      { error: "Müşteri borcu eklenemedi" },
      { status: 500 }
    );
  }
}
