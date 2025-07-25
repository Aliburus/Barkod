// Kasa işlemleri modeli
import mongoose from "mongoose";

const kasaSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  tahsilat: { type: Number, default: 0 },
  tahsilatDesc: { type: String, default: "" },
  harcama: { type: Number, default: 0 },
  harcamaDesc: { type: String, default: "" },
  banka: { type: Number, default: 0 },
  bankaDesc: { type: String, default: "" },
});

export default mongoose.models.Kasa || mongoose.model("Kasa", kasaSchema);
