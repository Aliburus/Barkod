import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Refund from "../models/Refund.js";
import Debt from "../models/Debt.js";
import Product from "../models/Product.js";

// Tüm iadeleri getir
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const debtId = searchParams.get("debtId");
    const customerId = searchParams.get("customerId");
    const subCustomerId = searchParams.get("subCustomerId");
    const status = searchParams.get("status");

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

    const refunds = await Refund.find(query)
      .populate({ path: "debtId", select: "amount description" })
      .populate({ path: "customerId", select: "name phone" })
      .populate({ path: "subCustomerId", select: "name phone" })
      .sort({ createdAt: -1 });

    return NextResponse.json(refunds);
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

    // Borç miktarını düşür
    debt.amount -= refundAmount;
    if (debt.amount < 0) {
      debt.amount = 0;
    }
    await debt.save();

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
