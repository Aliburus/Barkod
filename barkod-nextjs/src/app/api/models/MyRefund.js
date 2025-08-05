import mongoose from "mongoose";

const myRefundSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
  },
  vendorName: {
    type: String,
    required: true,
  },
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
  refundAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  debtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MyDebt",
    required: false,
  },
  refundDate: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["completed", "pending", "cancelled"],
    default: "completed",
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
myRefundSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const MyRefund =
  mongoose.models.MyRefund || mongoose.model("MyRefund", myRefundSchema);

export default MyRefund;
