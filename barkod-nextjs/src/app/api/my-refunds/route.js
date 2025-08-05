import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import MyRefund from "../models/MyRefund.js";
import MyDebt from "../models/MyDebt.js";
import Product from "../models/Product.js";

// Tüm tedarikçi iadelerini getir
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const vendorId = searchParams.get("vendorId");
    const status = searchParams.get("status");
    const filterType = searchParams.get("filterType");
    const filterValue = searchParams.get("filterValue");
    const dateFilterType = searchParams.get("dateFilterType");
    const dateRangeStart = searchParams.get("dateRangeStart");
    const dateRangeEnd = searchParams.get("dateRangeEnd");

    let query = {};

    if (vendorId) {
      query.vendorId = vendorId;
    }

    if (status) {
      query.status = status;
    }

    let refunds = await MyRefund.find(query)
      .populate({ path: "vendorId", select: "name phone" })
      .populate({ path: "debtId", select: "amount description" })
      .sort({ createdAt: -1 });

    // Tedarikçi bilgilerini ekle
    let refundsWithVendorInfo = refunds.map((refund) => {
      const refundObj = refund.toObject();
      return {
        ...refundObj,
        vendorName: refundObj.vendorId?.name || "Bilinmeyen Tedarikçi",
        vendorPhone: refundObj.vendorId?.phone || "-",
      };
    });

    return NextResponse.json(refundsWithVendorInfo);
  } catch (error) {
    console.error("Tedarikçi iadeleri getirilemedi:", error);
    return NextResponse.json(
      { error: "Tedarikçi iadeleri getirilemedi" },
      { status: 500 }
    );
  }
}

// Yeni tedarikçi iadesi oluştur
export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    console.log("Gelen tedarikçi iade verisi:", body);

    const {
      vendorId,
      vendorName,
      productId,
      productName,
      barcode,
      quantity,
      refundAmount,
      reason,
      debtId,
    } = body;

    // Gerekli alanları kontrol et
    if (!vendorId) {
      return NextResponse.json({ error: "vendorId gerekli" }, { status: 400 });
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

    // Ürün stoğunu azalt
    const product = await Product.findOne({ barcode });
    if (product) {
      if (product.stock < quantity) {
        return NextResponse.json(
          {
            error: `Stok yetersiz. Mevcut stok: ${product.stock}, İade edilecek: ${quantity}`,
          },
          { status: 400 }
        );
      }
      product.stock -= quantity;
      await product.save();
    }

    // Tedarikçi borcu kontrolü ve güncelleme
    let debtToUpdate = null;
    if (debtId) {
      debtToUpdate = await MyDebt.findById(debtId);
    } else {
      // Borç ID yoksa, tedarikçiye ait en son borcu bul
      debtToUpdate = await MyDebt.findOne({ vendorId }).sort({
        createdAt: -1,
      });
    }

    if (debtToUpdate) {
      // Borç tutarını azalt
      debtToUpdate.amount = Math.max(0, debtToUpdate.amount - refundAmount);
      await debtToUpdate.save();
    }

    // İade kaydını oluştur
    const refundData = {
      vendorId,
      vendorName,
      productId,
      productName,
      barcode,
      quantity,
      refundAmount,
      reason: reason || "Tedarikçi iadesi",
      debtId: debtToUpdate?._id,
      status: "completed",
    };

    console.log("Oluşturulacak tedarikçi iade verisi:", refundData);

    const refund = new MyRefund(refundData);
    await refund.save();

    // Populate edilmiş refund'u döndür
    const populatedRefund = await MyRefund.findById(refund._id)
      .populate({ path: "vendorId", select: "name phone" })
      .populate({ path: "debtId", select: "amount description" });

    return NextResponse.json(populatedRefund, { status: 201 });
  } catch (error) {
    console.error("Tedarikçi iadesi oluşturma hatası:", error);
    return NextResponse.json(
      { error: `Tedarikçi iadesi oluşturulamadı: ${error.message}` },
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

    const refund = await MyRefund.findById(refundId);
    if (!refund) {
      return NextResponse.json(
        { error: "İade kaydı bulunamadı" },
        { status: 404 }
      );
    }

    refund.reason = reason || "";
    await refund.save();

    return NextResponse.json(refund);
  } catch (error) {
    console.error("İade açıklaması güncellenirken hata:", error);
    return NextResponse.json(
      { error: "İade açıklaması güncellenemedi" },
      { status: 500 }
    );
  }
}
