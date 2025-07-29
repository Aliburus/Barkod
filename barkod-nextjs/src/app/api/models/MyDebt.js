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
