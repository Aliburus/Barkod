import mongoose from "mongoose";

const subCustomerSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      required: false,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "deleted"],
      default: "active",
    },
    color: {
      type: String,
      enum: ["yellow", "red", "blue", "green", "purple", "orange"],
      default: "blue",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
subCustomerSchema.index({ customerId: 1, name: 1 });
subCustomerSchema.index({ customerId: 1, phone: 1 });
subCustomerSchema.index({ status: 1 });

const SubCustomer =
  mongoose.models.SubCustomer ||
  mongoose.model("SubCustomer", subCustomerSchema);

export default SubCustomer;
