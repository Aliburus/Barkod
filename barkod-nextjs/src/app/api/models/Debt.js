import mongoose from "mongoose";

const debtSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
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
  type: {
    type: String,
    enum: ["sale", "manual", "adjustment"],
    default: "sale",
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale",
    required: false,
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  dueDate: {
    type: Date,
    required: false,
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
debtSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Kalan borç hesaplama
debtSchema.virtual("remainingAmount").get(function () {
  return this.amount - this.paidAmount;
});

const Debt = mongoose.models.Debt || mongoose.model("Debt", debtSchema);

export default Debt;
