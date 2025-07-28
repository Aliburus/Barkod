import mongoose from "mongoose";

const CustomerPaymentSchema = new mongoose.Schema(
  {
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
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    paymentType: {
      type: String,
      enum: ["nakit", "kredi_karti", "havale", "cek", "diger"],
      default: "nakit",
    },
    description: { type: String, default: "Ödeme" },
    debtId: { type: mongoose.Schema.Types.ObjectId, ref: "Debt" }, // Hangi borç için ödeme
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" }, // Hangi satış için ödeme
    receiptNumber: { type: String }, // Makbuz numarası
    notes: { type: String }, // Ek notlar
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "cancelled", "refunded"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index'ler ekle
CustomerPaymentSchema.index({ customerId: 1, paymentDate: -1 });
CustomerPaymentSchema.index({ paymentDate: -1 });
CustomerPaymentSchema.index({ debtId: 1 });
CustomerPaymentSchema.index({ saleId: 1 });

export default mongoose.models.CustomerPayment ||
  mongoose.model("CustomerPayment", CustomerPaymentSchema);
