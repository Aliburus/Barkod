const Product = require("../models/Product");

exports.createProduct = async (req, res) => {
  try {
    const { barcode, name, price, stock, category, brand } = req.body;
    const product = new Product({
      barcode,
      name,
      price,
      stock,
      category,
      brand,
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
    if (req.query.barcode) {
      const products = await Product.find({ barcode: req.query.barcode });
      return res.json(products);
    }
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode });
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ error: "Ürün bulunamadı" });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
