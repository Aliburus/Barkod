import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import PurchaseOrder from "../models/PurchaseOrder.js";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const vendorId = searchParams.get("vendorId");

    let query = {};
    if (vendorId) {
      query.vendorId = vendorId;
    }

    const purchaseOrders = await PurchaseOrder.find(query).sort({
      createdAt: -1,
    });

    // Test verisi ekle (eğer veri yoksa)
    if (purchaseOrders.length === 0 && vendorId) {
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
      const updatedOrders = await PurchaseOrder.find(query).sort({
        createdAt: -1,
      });

      return NextResponse.json(updatedOrders);
    }

    return NextResponse.json(purchaseOrders);
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
