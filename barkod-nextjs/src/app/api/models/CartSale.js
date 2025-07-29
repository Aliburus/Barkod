import mongoose from "mongoose";

const CartSaleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});

const CartSaleSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
  },
  items: [CartSaleItemSchema],
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ["nakit", "kredi kartı", "havale", "diğer"],
    default: "nakit",
  },
  isDebt: {
    type: Boolean,
    default: false,
  },
  saleType: {
    type: String,
    enum: ["sale", "purchase"],
    default: "sale",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Güncelleme zamanını otomatik ayarla
CartSaleSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const CartSale =
  mongoose.models.CartSale || mongoose.model("CartSale", CartSaleSchema);

export default CartSale;
