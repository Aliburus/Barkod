const Sale = require("../models/Sale");
const Product = require("../models/Product");

exports.createSale = async (req, res) => {
  try {
    const { barcode, quantity, soldAt, price, productName } = req.body;
    const product = await Product.findOne({ barcode });
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });
    if (product.stock < quantity)
      return res.status(400).json({ error: "Yeterli stok yok" });
    product.stock -= quantity;
    await product.save();
    const sale = new Sale({ barcode, quantity, soldAt, price, productName });
    await sale.save();
    res.status(201).json(sale);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSales = async (req, res) => {
  try {
    const sales = await Sale.find();
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Aylık satış verileri
exports.getMonthlySales = async (req, res) => {
  try {
    const sales = await Sale.aggregate([
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          total: { $sum: "$totalPrice" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
