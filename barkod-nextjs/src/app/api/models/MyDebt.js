import mongoose from "mongoose";

const myDebtSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
    },
    dueDate: {
      type: Date,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    purchaseOrderId: {
      type: String,
    },
    // Alıştan gelen ürün bilgileri
    productBarcodes: {
      type: [String],
      default: [],
    },
    productIds: {
      type: [String],
      default: [],
    },
    productDetails: {
      type: [{
        barcode: String,
        productId: String,
        productName: String,
        quantity: {
          type: Number,
          default: 1,
        },
        unitPrice: {
          type: Number,
          default: 0,
        },
        totalPrice: {
          type: Number,
          default: 0,
        },
      }],
      default: [],
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const MyDebt = mongoose.models.MyDebt || mongoose.model("MyDebt", myDebtSchema);

export default MyDebt;
