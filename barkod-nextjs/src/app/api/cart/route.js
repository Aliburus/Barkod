import { NextResponse } from "next/server";
import connectDB from "../utils/db";
import Cart from "../models/Cart";
import Product from "../models/Product";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  try {
    if (sessionId) {
      const cart = await Cart.findOne({ sessionId }).populate("items.product");
      return NextResponse.json(cart || { items: [] });
    }

    const carts = await Cart.find().populate("items.product");
    return NextResponse.json(carts);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { sessionId, items } = body;

    // Mevcut sepeti bul veya yeni oluştur
    let cart = await Cart.findOne({ sessionId });

    if (cart) {
      // Mevcut sepeti güncelle
      cart.items = items;
      await cart.save();
    } else {
      // Yeni sepet oluştur
      cart = new Cart({
        sessionId,
        items,
        createdAt: new Date(),
      });
      await cart.save();
    }

    return NextResponse.json(cart, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  await connectDB();
  try {
    const body = await request.json();
    const { sessionId, productId, quantity } = body;

    // Önce ürünü bul (barcode veya _id ile)
    let product = null;
    if (productId.match(/^[0-9a-fA-F]{24}$/)) {
      // ObjectId formatında
      product = await Product.findById(productId);
    } else {
      // Barcode formatında
      product = await Product.findOne({ barcode: productId });
    }

    if (!product) {
      return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });
    }

    let cart = await Cart.findOne({ sessionId });

    if (!cart) {
      cart = new Cart({
        sessionId,
        items: [],
        createdAt: new Date(),
      });
    }

    // Ürünü sepete ekle veya güncelle
    const existingItem = cart.items.find(
      (item) => item.product.toString() === product._id.toString()
    );

    if (existingItem) {
      if (quantity <= 0) {
        // Miktar 0 veya daha azsa ürünü kaldır
        cart.items = cart.items.filter(
          (item) => item.product.toString() !== product._id.toString()
        );
      } else {
        // Miktarı güncelle
        existingItem.quantity = quantity;
      }
    } else if (quantity > 0) {
      // Yeni ürün ekle
      cart.items.push({ product: product._id, quantity });
    }

    await cart.save();
    return NextResponse.json(cart);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  try {
    if (sessionId) {
      await Cart.findOneAndDelete({ sessionId });
      return NextResponse.json({ message: "Sepet silindi" });
    }

    return NextResponse.json({ error: "SessionId gerekli" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
