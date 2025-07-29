import mongoose from "mongoose";

const purchaseOrderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  barcode: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const purchaseOrderSchema = new mongoose.Schema(
  {
    vendorId: {
      type: String,
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    orderDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    items: [purchaseOrderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "received", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Toplam tutarı otomatik hesapla
purchaseOrderSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
  }
  next();
});

// Model adını değiştir (eski modeli temizlemek için)
const PurchaseOrder =
  mongoose.models.PurchaseOrderNew ||
  mongoose.model("PurchaseOrderNew", purchaseOrderSchema);

export default PurchaseOrder;
