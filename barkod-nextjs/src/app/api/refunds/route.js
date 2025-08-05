import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Refund from "../models/Refund.js";
import Debt from "../models/Debt.js";
import Product from "../models/Product.js";
import CustomerPayment from "../models/CustomerPayment.js";
import Customer from "../models/Customer.js";
import SubCustomer from "../models/SubCustomer.js";

// Tüm iadeleri getir
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const debtId = searchParams.get("debtId");
    const customerId = searchParams.get("customerId");
    const subCustomerId = searchParams.get("subCustomerId");
    const status = searchParams.get("status");
    const filterType = searchParams.get("filterType");
    const filterValue = searchParams.get("filterValue");
    const dateFilterType = searchParams.get("dateFilterType");
    const dateRangeStart = searchParams.get("dateRangeStart");
    const dateRangeEnd = searchParams.get("dateRangeEnd");

    let query = {};

    if (debtId) {
      query.debtId = debtId;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    if (subCustomerId) {
      query.subCustomerId = subCustomerId;
    }

    if (status) {
      query.status = status;
    }

    let refunds = await Refund.find(query)
      .populate({ path: "debtId", select: "amount description" })
      .populate({ path: "customerId", select: "name phone" })
      .populate({ path: "subCustomerId", select: "name phone" })
      .sort({ createdAt: -1 });

    // Müşteri ve alt müşteri bilgilerini ekle
    let refundsWithCustomerInfo = refunds.map((refund) => {
      const refundObj = refund.toObject();
      if (refundObj.customerId && typeof refundObj.customerId === "object") {
        refundObj.customerName = refundObj.customerId.name;
        refundObj.customerPhone = refundObj.customerId.phone;
      }
      if (
        refundObj.subCustomerId &&
        typeof refundObj.subCustomerId === "object"
      ) {
        refundObj.subCustomerName = refundObj.subCustomerId.name;
        refundObj.subCustomerPhone = refundObj.subCustomerId.phone;
      }
      return refundObj;
    });

    // Filter filtreleme
    if (filterType) {
      switch (filterType) {
        case "customer":
          if (filterValue) {
            refundsWithCustomerInfo = refundsWithCustomerInfo.filter(
              (refund) => {
                return refund.customerName
                  ?.toLowerCase()
                  .includes(filterValue.toLowerCase());
              }
            );
          }
          break;
        case "subcustomer":
          if (filterValue) {
            refundsWithCustomerInfo = refundsWithCustomerInfo.filter(
              (refund) => {
                return refund.subCustomerName
                  ?.toLowerCase()
                  .includes(filterValue.toLowerCase());
              }
            );
          }
          break;
        case "date":
          if (dateFilterType === "single" && filterValue) {
            const filterDate = new Date(filterValue);
            refundsWithCustomerInfo = refundsWithCustomerInfo.filter(
              (refund) => {
                const refundDate = new Date(refund.createdAt);
                return refundDate.toDateString() === filterDate.toDateString();
              }
            );
          } else if (dateFilterType === "range") {
            refundsWithCustomerInfo = refundsWithCustomerInfo.filter(
              (refund) => {
                const refundDate = new Date(refund.createdAt);
                const startDate = dateRangeStart
                  ? new Date(dateRangeStart)
                  : null;
                const endDate = dateRangeEnd ? new Date(dateRangeEnd) : null;

                if (startDate && endDate) {
                  return refundDate >= startDate && refundDate <= endDate;
                } else if (startDate) {
                  return refundDate >= startDate;
                } else if (endDate) {
                  return refundDate <= endDate;
                }
                return true;
              }
            );
          }
          break;
      }
    }

    return NextResponse.json(refundsWithCustomerInfo);
  } catch (error) {
    console.error("İadeler getirme hatası:", error);
    return NextResponse.json(
      { error: "İadeler getirilemedi" },
      { status: 500 }
    );
  }
}

// Test için: Refund collection'ını temizle
export async function DELETE(request) {
  try {
    await connectDB();
    await Refund.deleteMany({});
    return NextResponse.json({ message: "Refund collection temizlendi" });
  } catch (error) {
    console.error("Collection temizleme hatası:", error);
    return NextResponse.json(
      { error: "Collection temizlenemedi" },
      { status: 500 }
    );
  }
}

// Yeni iade oluştur
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    console.log("Gelen iade verisi:", body);

    const {
      debtId,
      productId,
      productName,
      barcode,
      quantity,
      refundAmount,
      customerId,
      subCustomerId,
      reason,
    } = body;

    // Gerekli alanları kontrol et
    if (!debtId) {
      return NextResponse.json({ error: "debtId gerekli" }, { status: 400 });
    }

    if (!productId) {
      return NextResponse.json({ error: "productId gerekli" }, { status: 400 });
    }

    if (!productName) {
      return NextResponse.json(
        { error: "productName gerekli" },
        { status: 400 }
      );
    }

    if (!barcode) {
      return NextResponse.json({ error: "barcode gerekli" }, { status: 400 });
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "quantity gerekli ve 1'den büyük olmalı" },
        { status: 400 }
      );
    }

    if (!refundAmount || refundAmount < 0) {
      return NextResponse.json(
        { error: "refundAmount gerekli ve 0'dan büyük olmalı" },
        { status: 400 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId gerekli" },
        { status: 400 }
      );
    }

    // Borç kaydını kontrol et
    const debt = await Debt.findById(debtId);
    if (!debt) {
      return NextResponse.json(
        { error: "Borç kaydı bulunamadı" },
        { status: 404 }
      );
    }

    // Ürün stoğunu artır
    const product = await Product.findOne({ barcode });
    if (product) {
      product.stock += quantity;
      await product.save();
    }

    // Kapanmış hesap kontrolü - borç ve ödeme toplamlarını kontrol et
    const totalDebt = debt.amount;
    const totalPayments = await CustomerPayment.aggregate([
      {
        $match: {
          customerId: customerId,
          ...(subCustomerId && { subCustomerId: subCustomerId }),
        },
      },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$amount" },
          totalRefunded: { $sum: { $ifNull: ["$refundAmount", 0] } },
        },
      },
    ]);

    const totalPaid = totalPayments.length > 0 ? totalPayments[0].totalPaid : 0;
    const totalRefunded =
      totalPayments.length > 0 ? totalPayments[0].totalRefunded : 0;
    const netPaid = totalPaid - totalRefunded;
    const isClosedAccount = netPaid >= totalDebt;

    // Fazladan iade kontrolü (🔴 3.1)
    const existingRefunds = await Refund.find({ debtId });
    const totalRefundedFromRefunds = existingRefunds.reduce(
      (sum, refund) => sum + refund.refundAmount,
      0
    );
    const totalRefundedAfterThis = totalRefundedFromRefunds + refundAmount;

    if (totalRefundedAfterThis > totalDebt) {
      return NextResponse.json(
        {
          error: `İade tutarı satış tutarından fazla olamaz. Toplam iade: ${totalRefundedAfterThis} TL, Satış: ${totalDebt} TL`,
        },
        { status: 400 }
      );
    }

    // Net bakiye hesaplama
    const netSales = totalDebt - totalRefundedFromRefunds; // İade sonrası net satış
    const netBalance = netPaid - netSales; // Net bakiye

    console.log(`=== BAKİYE ANALİZİ ===`);
    console.log(`Toplam Satış: ${totalDebt} TL`);
    console.log(`Toplam Ödeme: ${totalPaid} TL`);
    console.log(`Toplam Geri Ödeme: ${totalRefunded} TL`);
    console.log(`Net Ödeme: ${netPaid} TL`);
    console.log(`Mevcut İadeler: ${totalRefundedFromRefunds} TL`);
    console.log(`Bu İade: ${refundAmount} TL`);
    console.log(`Net Satış (İade Sonrası): ${netSales} TL`);
    console.log(`Net Bakiye: ${netBalance} TL`);
    console.log(`Hesap Durumu: ${isClosedAccount ? "KAPANMIŞ" : "AÇIK"}`);
    console.log(`========================`);

    if (isClosedAccount) {
      // Kapanmış hesap - geri ödeme işlemi
      console.log("Kapanmış hesap iadesi - geri ödeme işlemi");
      console.log(
        `Toplam Borç: ${totalDebt}, Toplam Ödeme: ${totalPaid}, Toplam Geri Ödeme: ${totalRefunded}, Net Ödeme: ${netPaid}`
      );

      // Yeni geri ödeme kaydı oluştur
      const refundPayment = new CustomerPayment({
        customerId: customerId,
        subCustomerId: subCustomerId || null,
        amount: 0, // Geri ödeme olduğu için 0
        refundAmount: refundAmount,
        paymentDate: new Date(),
        paymentType: "diger",
        description: "Geri Ödeme",
        notes: reason || "Kapanmış hesap iadesi",
        status: "active",
      });

      await refundPayment.save();
      console.log(`Geri ödeme kaydı oluşturuldu: ${refundAmount} TL`);
    } else {
      // Açık hesap - geri ödeme işlemi (kapanmış hesap gibi)
      console.log("Açık hesap iadesi - geri ödeme işlemi");
      console.log(
        `Toplam Borç: ${totalDebt}, Toplam Ödeme: ${totalPaid}, Toplam Geri Ödeme: ${totalRefunded}, Net Ödeme: ${netPaid}`
      );

      // Yeni geri ödeme kaydı oluştur
      const refundPayment = new CustomerPayment({
        customerId: customerId,
        subCustomerId: subCustomerId || null,
        amount: 0, // Geri ödeme olduğu için 0
        refundAmount: refundAmount,
        paymentDate: new Date(),
        paymentType: "diger",
        description: "Geri Ödeme",
        notes: reason || "Açık hesap iadesi",
        status: "active",
      });

      await refundPayment.save();
      console.log(`Geri ödeme kaydı oluşturuldu: ${refundAmount} TL`);
    }

    // İade kaydı oluştur
    const refundData = {
      debtId,
      productId,
      productName,
      barcode,
      quantity,
      refundAmount,
      customerId,
      subCustomerId,
      reason,
      status: "completed",
    };

    console.log("Oluşturulacak refund verisi:", refundData);

    const refund = new Refund(refundData);
    await refund.save();

    // Populate edilmiş refund'u döndür
    const populatedRefund = await Refund.findById(refund._id)
      .populate({ path: "debtId", select: "amount description" })
      .populate({ path: "customerId", select: "name phone" })
      .populate({ path: "subCustomerId", select: "name phone" });

    return NextResponse.json(populatedRefund, { status: 201 });
  } catch (error) {
    console.error("İade oluşturma hatası:", error);
    return NextResponse.json(
      { error: `İade oluşturulamadı: ${error.message}` },
      { status: 500 }
    );
  }
}

// İade açıklamasını güncelle
export async function PATCH(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { refundId, reason } = body;

    if (!refundId) {
      return NextResponse.json({ error: "refundId gerekli" }, { status: 400 });
    }

    const refund = await Refund.findById(refundId);
    if (!refund) {
      return NextResponse.json(
        { error: "İade kaydı bulunamadı" },
        { status: 404 }
      );
    }

    refund.reason = reason;
    await refund.save();

    return NextResponse.json({ message: "Açıklama güncellendi" });
  } catch (error) {
    console.error("İade güncelleme hatası:", error);
    return NextResponse.json({ error: "İade güncellenemedi" }, { status: 500 });
  }
}
