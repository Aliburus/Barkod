import mongoose from "mongoose";

const SaleSchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  quantity: { type: Number, required: true },
  soldAt: { type: Date, default: Date.now },
  price: { type: Number, required: true },
  productName: { type: String },
  customer: { type: String },
  paymentType: { type: String },
});

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
