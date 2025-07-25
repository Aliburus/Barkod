import mongoose from "mongoose";

const ExpenseSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  desc: { type: String, default: "" },
  frequency: { type: String, default: "tek" },
  paymentDate: { type: Date, required: true },
  status: { type: String, default: "active", required: true },
  createdAt: { type: Date, default: Date.now },
});

delete mongoose.connection.models["Expense"];
export default mongoose.model("Expense", ExpenseSchema);
