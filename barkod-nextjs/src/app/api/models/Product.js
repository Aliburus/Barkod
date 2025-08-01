import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
  barcode: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  purchasePrice: { type: Number, default: 0 },
  stock: { type: Number, required: true, default: 0 },
  category: { type: String },
  brand: { type: String },
  shelf: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  supplier: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: "Vendor",
    required: true,
    validate: [
      (v) => Array.isArray(v) && v.length > 0,
      "En az bir tedarikçi seçmelisiniz.",
    ],
  },
  oem: { type: String },
  kod1: { type: String },
  kod2: { type: String },
  usedCars: [{ type: String }],
});

export default mongoose.models.Product ||
  mongoose.model("Product", ProductSchema);
