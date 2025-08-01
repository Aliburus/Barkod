import { NextResponse } from "next/server";
import connectDB from "../../utils/db.js";
import CustomerPayment from "../../models/CustomerPayment.js";

// Ödeme açıklamasını güncelle
export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { paymentId } = params;
    const body = await request.json();
    const { description } = body;

    if (!description) {
      return NextResponse.json({ error: "Açıklama gerekli" }, { status: 400 });
    }

    const payment = await CustomerPayment.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: "Ödeme kaydı bulunamadı" },
        { status: 404 }
      );
    }

    payment.description = description;
    await payment.save();

    return NextResponse.json(payment, { status: 200 });
  } catch (error) {
    console.error("Ödeme güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Ödeme güncellenemedi" },
      { status: 500 }
    );
  }
}
