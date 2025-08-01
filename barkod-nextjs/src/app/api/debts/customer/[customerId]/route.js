import { NextResponse } from "next/server";
import connectDB from "../../../utils/db.js";
import Debt from "../../../models/Debt";
import CustomerPayment from "../../../models/CustomerPayment";
import Refund from "../../../models/Refund";
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

    // Refunds tablosundan iade edilen ürünleri getir
    const refunds = await Refund.find({ customerId }).select(
      "debtId barcode refundAmount"
    );

    // SubCustomer için iade filtreleme
    let filteredRefunds = refunds;
    if (subCustomerId) {
      // SubCustomer'a ait borçların ID'lerini bul
      const subCustomerDebtIds = debts.map((debt) => debt._id.toString());
      // Sadece bu borçlara ait iadeleri filtrele
      filteredRefunds = refunds.filter((refund) =>
        subCustomerDebtIds.includes(refund.debtId.toString())
      );
    }

    // Toplam iade hesaplama (SubCustomer'a özel)
    const totalRefunded = filteredRefunds.reduce(
      (sum, refund) => sum + refund.refundAmount,
      0
    );

    // Her borç için iade edilen miktarları hesapla (ürün bazında)
    const debtRefunds = {};
    filteredRefunds.forEach((refund) => {
      if (!debtRefunds[refund.debtId]) {
        debtRefunds[refund.debtId] = {};
      }
      if (!debtRefunds[refund.debtId][refund.barcode]) {
        debtRefunds[refund.debtId][refund.barcode] = 0;
      }
      debtRefunds[refund.debtId][refund.barcode] += refund.refundAmount;
    });

    // Toplam borç hesaplama (Bu artık orijinal satış tutarı olmalı, çünkü refund'lar debt.amount'u düşürmüyor)
    const totalDebt = debts.reduce((sum, debt) => {
      return sum + (debt.amount || 0);
    }, 0);

    // Net satış hesaplama: Orijinal satış - Toplam iade
    const netSales = totalDebt - totalRefunded;

    // Müşterinin ödemelerini getir (filtreye göre)
    let payments = [];
    let totalPaid = 0;

    if (filterType === "all" || filterType === "payments") {
      try {
        const paymentQuery = {
          customerId: new mongoose.Types.ObjectId(customerId),
          status: "active",
        };
        if (subCustomerId) {
          paymentQuery.subCustomerId = new mongoose.Types.ObjectId(
            subCustomerId
          );
        }
        payments = await CustomerPayment.find(paymentQuery).sort({
          paymentDate: -1,
        });

        // Toplam ödeme hesaplama (sadece amount)
        const aggregateMatch = {
          customerId: new mongoose.Types.ObjectId(customerId),
          status: "active",
        };
        if (subCustomerId) {
          aggregateMatch.subCustomerId = new mongoose.Types.ObjectId(
            subCustomerId
          );
        }
        const totalPaymentsAggregate = await CustomerPayment.aggregate([
          { $match: aggregateMatch },
          {
            $group: {
              _id: null,
              totalPaid: { $sum: "$amount" },
            },
          },
        ]);

        totalPaid =
          totalPaymentsAggregate.length > 0
            ? totalPaymentsAggregate[0].totalPaid
            : 0;
      } catch (aggregationError) {
        console.error("Ödeme hesaplama hatası:", aggregationError);
        totalPaid = payments.reduce(
          (sum, payment) => sum + (payment.amount || 0),
          0
        );
      }
    }

    // Net ödeme hesaplama (SubCustomer'a özel)
    const netPaid = totalPaid;

    // Kalan borç hesaplama (doğru mantık: Orijinal Satış - Toplam İade - Toplam Ödeme)
    const remainingDebt = Math.max(0, netSales - netPaid);

    // Console log for debugging
    console.log("=== BAKİYE HESAPLAMA (SUB CUSTOMER) ===");
    console.log(`Orijinal Toplam Borç: ${totalDebt} TL`);
    console.log(`Toplam İade: ${totalRefunded} TL`);
    console.log(`Net Satış: ${netSales} TL`);
    console.log(`Toplam Ödeme: ${totalPaid} TL`);
    console.log(`Net Ödeme: ${netPaid} TL`);
    console.log(`Kalan Borç: ${remainingDebt} TL`);
    console.log("==========================");

    // Borç verilerine iade bilgilerini ekle
    const debtsWithRefunds = debts.map((debt) => {
      const debtRefundsForDebt = debtRefunds[debt._id] || {};
      const totalRefundedAmount = Object.values(debtRefundsForDebt).reduce(
        (sum, amount) => sum + amount,
        0
      );
      // debt.amount zaten refund'lardan düşürülmüş halde geliyor
      const remainingAmount = debt.amount || 0;
      return {
        ...debt.toObject(),
        refundedAmount: totalRefundedAmount,
        remainingAmount,
        hasRefunds: totalRefundedAmount > 0,
        refundsByProduct: debtRefundsForDebt, // Ürün bazında iade bilgileri
      };
    });

    return NextResponse.json({
      debts: debtsWithRefunds,
      payments,
      totalDebt,
      totalPaid,
      remainingDebt,
      totalDebts: debts.length,
      totalPayments: payments.length,
      filterType,
      debtRefunds, // İade bilgilerini de gönder
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
