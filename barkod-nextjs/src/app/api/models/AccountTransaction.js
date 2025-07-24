import mongoose from "mongoose";

const AccountTransactionSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["borc", "odeme"], required: true },
  description: { type: String },
});

export default mongoose.models.AccountTransaction ||
  mongoose.model("AccountTransaction", AccountTransactionSchema);
