import mongoose from "mongoose";

const SaleItemSchema = new mongoose.Schema({
  barcode: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  productName: { type: String, required: false },
  description: { type: String, required: false },
});

const SaleSchema = new mongoose.Schema({
  // Sepet satışı için alanlar
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
  subCustomerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCustomer",
    required: false,
  },
  items: [SaleItemSchema],
  totalAmount: { type: Number, required: true },
  paymentType: { type: String, required: true },
  description: { type: String, required: false },
  isDebt: { type: Boolean, default: false },
  dueDate: { type: Date },

  soldAt: { type: Date, default: Date.now },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  status: { type: String, default: "active" },
});

// Güncelleme zamanını otomatik ayarla
SaleSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
