import React, { useState } from "react";
import { Product, Sale } from "../types";
import { ShoppingCart, X, Plus, Minus } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface SaleModalProps {
  product: Product;
  onSale: (sale: Sale) => void;
  onClose: () => void;
}

const SaleModal: React.FC<SaleModalProps> = ({ product, onSale, onClose }) => {
  const [quantity, setQuantity] = useState(1);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-800">Satış Yap</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">{product.name}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Barkod: {product.barcode}</p>
              <p>Birim Fiyat: {formatPrice(product.price)}</p>
              <p>Mevcut Stok: {product.stock} adet</p>
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
                className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setQuantity(Math.min(Math.max(val, 1), product.stock));
                }}
                className="w-20 px-3 py-2 text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button
                onClick={incrementQuantity}
                disabled={quantity >= product.stock}
                className="p-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center text-lg font-semibold">
              <span className="text-gray-700">Toplam:</span>
              <span className="text-blue-700">
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
