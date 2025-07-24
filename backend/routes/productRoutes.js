const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.post("/", productController.createProduct);
router.get("/", productController.getProducts);
router.patch("/:id", productController.updateProduct);
router.get("/:barcode", productController.getProductByBarcode);

module.exports = router;
