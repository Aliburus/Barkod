import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Debt from "../models/Debt";

// Tüm borçları getir
export async function GET() {
  try {
    await connectDB();
    const debts = await Debt.find()
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "subCustomerId",
        select: "name phone",
        strictPopulate: false,
      })
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
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "subCustomerId",
        select: "name phone",
        strictPopulate: false,
      })
      .populate("saleId");

    return NextResponse.json(populatedDebt, { status: 201 });
  } catch (error) {
    console.error("Borç ekleme hatası:", error);
    return NextResponse.json({ error: "Borç eklenemedi" }, { status: 500 });
  }
}

// Borç sil
export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const debtId = searchParams.get("id");

    if (!debtId) {
      return NextResponse.json(
        { error: "Borç ID'si gerekli" },
        { status: 400 }
      );
    }

    const deletedDebt = await Debt.findByIdAndDelete(debtId);

    if (!deletedDebt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ message: "Borç başarıyla silindi" });
  } catch (error) {
    console.error("Borç silme hatası:", error);
    return NextResponse.json({ error: "Borç silinemedi" }, { status: 500 });
  }
}
