import mongoose from "mongoose";

const refundSchema = new mongoose.Schema({
  debtId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Debt",
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
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  subCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCustomer",
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
refundSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Refund = mongoose.models.Refund || mongoose.model("Refund", refundSchema);

export default Refund;
