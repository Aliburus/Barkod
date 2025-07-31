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
    const productName = searchParams.get("productName")?.trim();
    const subCustomerId = searchParams.get("subCustomerId")?.trim();

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
      // Eğer productName varsa, ürün adı veya barkodunda arama yap
      const debtQuery = { customerId };
      if (subCustomerId) {
        debtQuery.subCustomerId = subCustomerId;
      }
      let populateOptions = {
        path: "saleId",
        select: "totalAmount createdAt items barcode productName",
      };

      // Yeni ürün bilgilerini de populate et
      const populateProductIds = {
        path: "productIds",
        select: "name barcode",
      };
      if (productName) {
        // saleId.productName veya saleId.items.productName/barcode içinde arama
        // Not: saleId bir referans olduğu için, populate sonrası filtreleme yapılabilir
        debts = await Debt.find(debtQuery)
          .populate(populateOptions)
          .sort({ createdAt: -1 });
        debts = debts.filter((debt) => {
          if (!debt.saleId) return false;
          // saleId.productName veya saleId.barcode
          const mainName = debt.saleId.productName?.toLowerCase() || "";
          const mainBarcode = debt.saleId.barcode?.toLowerCase() || "";
          const search = productName.toLowerCase();
          let found = false;
          if (mainName.includes(search) || mainBarcode.includes(search))
            found = true;
          // saleId.items (array) içinde arama
          if (Array.isArray(debt.saleId.items)) {
            for (const item of debt.saleId.items) {
              const itemName = item.productName?.toLowerCase() || "";
              const itemBarcode = item.barcode?.toLowerCase() || "";
              if (itemName.includes(search) || itemBarcode.includes(search)) {
                found = true;
                break;
              }
            }
          }
          // Yeni productDetails alanında arama
          if (debt.productDetails && Array.isArray(debt.productDetails)) {
            for (const detail of debt.productDetails) {
              const detailName = detail.productName?.toLowerCase() || "";
              const detailBarcode = detail.barcode?.toLowerCase() || "";
              if (
                detailName.includes(search) ||
                detailBarcode.includes(search)
              ) {
                found = true;
                break;
              }
            }
          }
          return found;
        });
      } else {
        debts = await Debt.find(debtQuery)
          .populate(populateOptions)
          .sort({ createdAt: -1 });
      }
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
        const paymentQuery = {
          customerId,
          status: "active",
        };
        if (subCustomerId) {
          paymentQuery.subCustomerId = subCustomerId;
        }
        payments = await CustomerPayment.find(paymentQuery).sort({
          paymentDate: -1,
        });

        // Toplam ödeme hesaplama
        const aggregateMatch = {
          customerId: new mongoose.Types.ObjectId(customerId),
          status: "active",
        };
        if (subCustomerId) {
          aggregateMatch.subCustomerId = new mongoose.Types.ObjectId(
            subCustomerId
          );
        }
        const totalPayments = await CustomerPayment.aggregate([
          { $match: aggregateMatch },
          { $group: { _id: null, total: { $sum: "$amount" } } },
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
