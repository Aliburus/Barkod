import mongoose from "mongoose";

const myPaymentSchema = new mongoose.Schema(
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
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentType: {
      type: String,
      enum: ["nakit", "havale", "cek", "diger"],
      default: "nakit",
    },
    description: {
      type: String,
    },
    debtId: {
      type: String,
    },
    receiptNumber: {
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

const MyPayment =
  mongoose.models.MyPayment || mongoose.model("MyPayment", myPaymentSchema);

export default MyPayment;
