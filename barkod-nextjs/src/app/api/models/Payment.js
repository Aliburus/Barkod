import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  company: { type: String },
  name: { type: String },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  isInstallment: { type: Boolean, default: false },
  installmentCount: { type: Number },
  installmentStart: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Payment ||
  mongoose.model("Payment", PaymentSchema);
