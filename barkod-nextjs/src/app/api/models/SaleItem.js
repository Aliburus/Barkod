import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    barcode: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    customPrice: {
      type: Number,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    subCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCustomer",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index'ler ekleyelim
saleItemSchema.index({ saleId: 1 });
saleItemSchema.index({ customerId: 1 });
saleItemSchema.index({ productId: 1 });
saleItemSchema.index({ barcode: 1 });
saleItemSchema.index({ createdAt: -1 });

export default mongoose.models.SaleItem ||
  mongoose.model("SaleItem", saleItemSchema);
