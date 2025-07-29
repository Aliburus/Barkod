import { NextResponse } from "next/server";
import connectDB from "../../../utils/db.js";
import Debt from "../../../models/Debt";
import CustomerPayment from "../../../models/CustomerPayment";
import mongoose from "mongoose";

// Müşterinin borçlarını getir
export async function GET(request, { params }) {
  try {
    await connectDB();
    const { customerId } = await params;

    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get("filter") || "all"; // all, debts, payments

    // customerId'nin geçerli olup olmadığını kontrol et
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      return NextResponse.json(
        { error: "Geçersiz müşteri ID'si" },
        { status: 400 }
      );
    }

    // Borçları getir (filtreye göre)
    let debts = [];
    if (filterType === "all" || filterType === "debts") {
      debts = await Debt.find({ customerId })
        .populate("saleId", "totalAmount createdAt items barcode productName")
        .sort({ createdAt: -1 });
    }

    // Toplam borç hesaplama (tüm borçlar)
    const totalDebt = debts.reduce((sum, debt) => {
      return sum + (debt.amount || 0);
    }, 0);

    // Müşterinin ödemelerini getir (filtreye göre)
    let payments = [];
    let totalPaid = 0;

    if (filterType === "all" || filterType === "payments") {
      try {
        payments = await CustomerPayment.find({
          customerId,
          status: "active",
        }).sort({ paymentDate: -1 });

        // Toplam ödeme hesaplama
        const totalPayments = await CustomerPayment.aggregate([
          {
            $match: {
              customerId: new mongoose.Types.ObjectId(customerId),
              status: "active",
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
            },
          },
        ]);

        totalPaid = totalPayments.length > 0 ? totalPayments[0].total : 0;
      } catch (aggregationError) {
        console.error("Ödeme hesaplama hatası:", aggregationError);
        // Aggregation hatası durumunda basit sorgu kullan
        totalPaid = payments.reduce(
          (sum, payment) => sum + (payment.amount || 0),
          0
        );
      }
    }

    const remainingDebt = Math.max(0, totalDebt - totalPaid);

    return NextResponse.json({
      debts,
      payments,
      totalDebt,
      totalPaid,
      remainingDebt,
      totalDebts: debts.length,
      totalPayments: payments.length,
      filterType,
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
