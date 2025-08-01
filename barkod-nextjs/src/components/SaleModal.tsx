"use client";
import React, { useState } from "react";
import { Product } from "../types";
import { ShoppingCart, X, Plus, Minus } from "lucide-react";

interface SaleModalProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
  onClose: () => void;
  onNotification?: (message: string, type: "success" | "error" | "warning") => void;
}

const SaleModal: React.FC<SaleModalProps> = ({
  product,
  onAddToCart,
  onClose,
  onNotification,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [currentStock] = useState(product.stock);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const handleAddToCart = () => {
    if (quantity > product.stock) {
      onNotification?.(
        `${product.name} için yeterli stok yok. (Mevcut: ${product.stock})`,
        "warning"
      );
      return;
    }
    onAddToCart(product, quantity);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg p-3 sm:p-6 relative max-h-[90vh] overflow-y-auto flex flex-col"
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
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 mb-6 border border-gray-200 dark:border-gray-700 relative">
            <div className="flex flex-col items-center mb-2">
              <span className="text-xl font-bold text-gray-900 dark:text-white text-center mb-1">
                {product.name}
              </span>
              <span className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 text-center">
                {formatPrice(product.price)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="flex flex-col items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Barkod
                </span>
                <span className="text-gray-900 dark:text-white font-mono">
                  {product.barcode}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Stok
                </span>
                <span className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {currentStock} adet
                </span>
              </div>
              {product.category && (
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Kategori
                  </span>
                  <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold mt-1">
                    {product.category}
                  </span>
                </div>
              )}
              {product.brand && (
                <div className="flex flex-col items-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Marka
                  </span>
                  <span className="inline-block px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 text-xs font-semibold mt-1">
                    {product.brand}
                  </span>
                </div>
              )}
            </div>
            {typeof product.purchasePrice === "number" && (
              <span className="absolute right-3 bottom-2 text-xs text-gray-400 dark:text-gray-600 opacity-60 select-none">
                {formatPrice(product.purchasePrice)}
              </span>
            )}
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
              onClick={handleAddToCart}
              disabled={quantity > product.stock}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Sepete Ekle
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
