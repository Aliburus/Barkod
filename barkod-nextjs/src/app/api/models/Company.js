import mongoose from "mongoose";

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Company ||
  mongoose.model("Company", CompanySchema);
