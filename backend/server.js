const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const saleRoutes = require("./routes/saleRoutes");

// Ortam değişkenlerini yükle
dotenv.config();

// MongoDB bağlantısı
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API Çalışıyor");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor`);
});
