import { NextResponse } from "next/server";
import connectDB from "../utils/db.js";
import PurchaseOrder from "../models/PurchaseOrder.js";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = parseInt(searchParams.get("skip") || "0");

    let query = {};
    if (vendorId) {
      query.vendorId = vendorId;
    }

    // Date filtering - optimized
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Search functionality - optimized with index support
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "items.productName": { $regex: search, $options: "i" } },
        { "items.barcode": { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort object - optimized for common cases
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Optimized query with projection for better performance
    const purchaseOrders = await PurchaseOrder.find(query)
      .select(
        "_id vendorId orderNumber orderDate items totalAmount status notes createdAt updatedAt"
      )
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance

    // Check if there are more results - optimized count
    const totalCount = await PurchaseOrder.countDocuments(query);
    const hasMore = skip + limit < totalCount;
    const nextSkip = hasMore ? skip + limit : skip;

    // Test verisi ekle (eğer veri yoksa) - only for first page
    if (purchaseOrders.length === 0 && vendorId && skip === 0) {
      const testOrder = new PurchaseOrder({
        vendorId: vendorId,
        orderNumber: `PO-TEST-${Date.now()}`,
        orderDate: new Date(),
        items: [
          {
            productId: "test-product-id",
            productName: "Test Ürün",
            barcode: "123456789",
            quantity: 10,
            unitPrice: 100,
            totalPrice: 1000,
            createdAt: new Date(),
          },
        ],
        totalAmount: 1000,
        status: "received",
        notes: "Test siparişi",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await testOrder.save();

      // Test verisini de döndür
      const updatedOrders = await PurchaseOrder.find(query)
        .select(
          "_id vendorId orderNumber orderDate items totalAmount status notes createdAt updatedAt"
        )
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean();

      return NextResponse.json({
        orders: updatedOrders,
        hasMore: false,
        nextSkip: skip,
      });
    }

    return NextResponse.json({
      orders: purchaseOrders,
      hasMore,
      nextSkip,
    });
  } catch (error) {
    console.error("Purchase orders GET error:", error);
    return NextResponse.json(
      { error: "Siparişler yüklenirken hata oluştu" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    console.log("Purchase order POST body:", body);

    // ProductForm'dan gelen veriyi düzelt
    const purchaseOrderData = {
      vendorId: body.vendorId,
      orderNumber: body.orderNumber,
      orderDate: new Date(body.orderDate || Date.now()),
      items: body.items.map((item) => ({
        productId: item.productId || "000000000000000000000000", // Geçici ID
        productName: item.productName,
        barcode: item.barcode,
        quantity: parseInt(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        totalPrice: parseFloat(item.totalPrice),
        createdAt: new Date(), // Her ürün için ayrı tarih
      })),
      totalAmount: parseFloat(body.totalAmount),
      status: body.status,
      notes: body.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Processed purchase order data:", purchaseOrderData);

    const purchaseOrder = new PurchaseOrder(purchaseOrderData);
    await purchaseOrder.save();

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("Purchase order POST error:", error);
    return NextResponse.json(
      { error: "Sipariş oluşturulurken hata oluştu", details: error.message },
      { status: 500 }
    );
  }
}
