const express = require("express");
const router = express.Router();
const saleController = require("../controllers/saleController");
const { getMonthlySales } = require("../controllers/saleController");

router.post("/", saleController.createSale);
router.get("/", saleController.getSales);
router.get("/monthly-sales", getMonthlySales);

module.exports = router;
