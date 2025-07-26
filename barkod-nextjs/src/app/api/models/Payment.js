import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  company: { type: String },
  name: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  isInstallment: { type: Boolean, default: false },
  installmentCount: { type: Number },
  installmentStart: { type: Date },
  paymentType: { type: String },
  description: { type: String },
  isPaid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "active" },
});

export default mongoose.models.Payment ||
  mongoose.model("Payment", PaymentSchema);
