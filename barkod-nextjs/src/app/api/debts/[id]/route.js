import { NextResponse } from "next/server";
import connectDB from "../../utils/db";
import Debt from "../../models/Debt";

// Belirli borç kaydını getir
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const debt = await Debt.findById(id)
      .populate("customerId", "name phone")
      .populate("saleId", "totalAmount createdAt");

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Borç getirme hatası:", error);
    return NextResponse.json({ error: "Borç getirilemedi" }, { status: 500 });
  }
}

// Borç güncelle
export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const debt = await Debt.findByIdAndUpdate(id, body, { new: true })
      .populate("customerId", "name phone")
      .populate("saleId", "totalAmount createdAt");

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(debt);
  } catch (error) {
    console.error("Borç güncelleme hatası:", error);
    return NextResponse.json({ error: "Borç güncellenemedi" }, { status: 500 });
  }
}

// Borç sil
export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const debt = await Debt.findByIdAndDelete(id);

    if (!debt) {
      return NextResponse.json({ error: "Borç bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({ message: "Borç başarıyla silindi" });
  } catch (error) {
    console.error("Borç silme hatası:", error);
    return NextResponse.json({ error: "Borç silinemedi" }, { status: 500 });
  }
}
 