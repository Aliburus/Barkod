import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  quantity: { type: Number, required: true },
  soldAt: { type: Date, required: true },
  price: { type: Number, required: true },
  productName: { type: String, required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  paymentType: { type: String },
});

export default mongoose.models.Sale || mongoose.model("Sale", saleSchema);
