import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import Sale from "../models/Sale";
import Product from "../models/Product";
import Debt from "../models/Debt";
import SubCustomer from "../models/SubCustomer";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit")) || 50;
  const skip = parseInt(searchParams.get("skip")) || 0;
  const search = searchParams.get("search");
  const customerId = searchParams.get("customerId");
  const period = searchParams.get("period");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  try {
    let query = {};
    if (search) {
      query = {
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { barcode: { $regex: search, $options: "i" } },
        ],
      };
    }

    // Eğer customerId varsa, sadece o müşterinin satışlarını getir
    if (customerId) {
      query.customerId = customerId;
    }

    // Tarih filtresi
    if (period && period !== "all") {
      const now = new Date();
      let startOfPeriod, endOfPeriod;

      switch (period) {
        case "today":
          startOfPeriod = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          endOfPeriod = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          );
          break;
        case "week":
          const dayOfWeek = now.getDay();
          const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
          startOfPeriod = new Date(now.getFullYear(), now.getMonth(), diff);
          endOfPeriod = new Date(
            startOfPeriod.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          break;
        case "month":
          startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
          endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        case "custom":
          if (startDate && endDate) {
            startOfPeriod = new Date(startDate);
            endOfPeriod = new Date(endDate);
            endOfPeriod.setDate(endOfPeriod.getDate() + 1);
          }
          break;
      }

      if (startOfPeriod && endOfPeriod) {
        query.createdAt = {
          $gte: startOfPeriod,
          $lt: endOfPeriod,
        };
      }
    }

    // Silinmiş satışları getirme
    query.status = { $ne: "deleted" };

    const sales = await Sale.find(query)
      .populate({ path: "customerId", select: "name phone" })
      .populate({
        path: "subCustomerId",
        select: "name phone",
        strictPopulate: false,
      })
      .sort({ createdAt: -1 }) // En yeni satışlar önce
      .skip(skip)
      .limit(limit);

    // Daha fazla satış var mı kontrol et
    const hasMore = sales.length === limit;

    return NextResponse.json({
      sales,
      hasMore,
      nextSkip: skip + limit,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const {
      barcode,
      quantity,
      soldAt,
      price,
      productName,
      customer,
      paymentType,
      customerId,
      subCustomerId,
      isDebt,
      totalAmount,
      items,
      dueDate,
    } = body;

    // Eğer items array'i varsa (sepet satışı)
    if (items && items.length > 0) {
      // Stok kontrolü ve güncelleme
      for (const item of items) {
        const product = await Product.findOne({ barcode: item.barcode });
        if (!product) {
          return NextResponse.json(
            { error: `Ürün bulunamadı: ${item.barcode}` },
            { status: 404 }
          );
        }
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Yeterli stok yok: ${product.name}` },
            { status: 400 }
          );
        }
        product.stock -= item.quantity;
        await product.save();
      }

      // Satış kaydı oluştur
      const sale = new Sale({
        customerId,
        subCustomerId,
        items,
        totalAmount,
        paymentType,
        isDebt,
        dueDate,
      });
      await sale.save();

      // Eğer borçlu satış ise, borç kaydı oluştur
      if (isDebt && customerId) {
        // Detaylı ürün açıklaması oluştur
        const productDetails = items
          .map((item) => {
            const quantity = item.quantity || 1;
            const productName =
              item.productName || item.name || "Bilinmeyen Ürün";
            return `${quantity} adet ${productName}`;
          })
          .join(", ");

        const debt = new Debt({
          customerId,
          subCustomerId,
          amount: totalAmount,
          description: `Satış borcu - ${productDetails}`,
          type: "sale",
          saleId: sale._id,
          dueDate: dueDate || null,
        });
        await debt.save();
      }

      // Alt müşteri hesabını otomatik aç
      if (subCustomerId) {
        const subCustomer = await SubCustomer.findById(subCustomerId);
        if (subCustomer && subCustomer.status === "inactive") {
          subCustomer.status = "active";
          await subCustomer.save();
        }
      }

      return NextResponse.json(sale, { status: 201 });
    } else {
      // Tek ürün satışı (eski format)
      const product = await Product.findOne({ barcode });
      if (!product)
        return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
      if (product.stock < quantity)
        return NextResponse.json(
          { error: "Yeterli stok yok" },
          { status: 400 }
        );

      product.stock -= quantity;
      await product.save();

      const sale = new Sale({
        barcode,
        quantity,
        soldAt,
        price,
        productName,
        customer,
        paymentType,
      });
      await sale.save();
      return NextResponse.json(sale, { status: 201 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const sale = await Sale.findByIdAndUpdate(id, updates, { new: true });
    if (!sale)
      return NextResponse.json({ error: "Satış bulunamadı" }, { status: 404 });
    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  await connectDB();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    const result = await Sale.findByIdAndUpdate(id, { status: "deleted" });
    if (!result)
      return NextResponse.json({ error: "Satış bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
