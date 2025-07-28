import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    color: { type: String, default: "" },
  },
  { timestamps: true }
);

// Search için index'ler ekle
CustomerSchema.index({ name: "text", phone: "text", address: "text" });
CustomerSchema.index({ createdAt: -1 });

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);
