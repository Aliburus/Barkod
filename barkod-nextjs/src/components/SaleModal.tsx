"use client";
import React, { useState } from "react";
import { Product, Sale } from "../types";
import { ShoppingCart, X, Plus, Minus, Edit2, Check } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { productService } from "../services/productService";

interface SaleModalProps {
  product: Product;
  onSale: (sale: Sale) => void;
  onClose: () => void;
}

const SaleModal: React.FC<SaleModalProps> = ({ product, onSale, onClose }) => {
  const [quantity, setQuantity] = useState(1);
  const [editingStock, setEditingStock] = useState(false);
  const [stockValue, setStockValue] = useState(product.stock.toString());
  const [loading, setLoading] = useState(false);
  const [currentStock, setCurrentStock] = useState(product.stock);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const handleSale = () => {
    if (quantity > product.stock) {
      alert("Yetersiz stok!");
      return;
    }

    const sale: Sale = {
      id: uuidv4(),
      barcode: product.barcode,
      productName: product.name,
      quantity,
      price: product.price,
      total: product.price * quantity,
      soldAt: new Date().toISOString(),
    };

    onSale(sale);
    onClose();
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleStockUpdate = async () => {
    setLoading(true);
    const updated = await productService.update(product.barcode, {
      stock: parseInt(stockValue),
    });
    setCurrentStock(updated.stock);
    setEditingStock(false);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md max-h-[calc(100vh-64px)] flex flex-col"
        style={{ marginTop: 32, marginBottom: 32 }}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Satış Yap
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {/* Product Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              {product.name}
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <p>Barkod: {product.barcode}</p>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                {formatPrice(product.price)}
              </div>
              <p className="flex items-center gap-1">
                Mevcut Stok:{" "}
                {editingStock ? (
                  <>
                    <input
                      type="number"
                      value={stockValue}
                      onChange={(e) => setStockValue(e.target.value)}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      disabled={loading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleStockUpdate();
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleStockUpdate}
                      className="ml-1 text-success-600 hover:text-success-800"
                      disabled={loading}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {currentStock} adet
                    <button
                      onClick={() => setEditingStock(true)}
                      className="ml-1 text-gray-400 hover:text-primary-600"
                      title="Stok Güncelle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </p>
              {product.brand && <p>Marka: {product.brand}</p>}
              {product.category && <p>Kategori: {product.category}</p>}
            </div>
          </div>

          {/* Quantity Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Miktar:
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={decrementQuantity}
                disabled={quantity <= 1}
                className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                <Minus className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </button>
              <div className="w-12 h-10 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-lg font-semibold text-gray-900 dark:text-white">
                {quantity}
              </div>
              <button
                onClick={incrementQuantity}
                disabled={quantity >= product.stock}
                className="w-10 h-10 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-50"
              >
                <Plus className="w-5 h-5 text-gray-700 dark:text-gray-200" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span className="text-gray-700 dark:text-gray-200">Toplam:</span>
              <span className="text-blue-700 dark:text-blue-400">
                {formatPrice(product.price * quantity)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSale}
              disabled={quantity > product.stock}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Satışı Tamamla
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 transition-colors font-medium"
            >
              İptal
            </button>
          </div>

          {quantity > product.stock && (
            <p className="text-red-600 text-sm mt-2 text-center">
              Yetersiz stok! Maksimum {product.stock} adet satılabilir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaleModal;
