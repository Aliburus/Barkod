"use client";
import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { Save, X, Package } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: Product) => void;
  onCancel: () => void;
  prefilledBarcode?: string;
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  onSave,
  onCancel,
  prefilledBarcode,
}) => {
  const [formData, setFormData] = useState({
    barcode: prefilledBarcode || "",
    name: "",
    price: "",
    purchasePrice: "",
    stock: "",
    category: "",
    brand: "",
  });

  useEffect(() => {
    if (product) {
      setFormData({
        barcode: product.barcode,
        name: product.name,
        price: product.price.toString(),
        purchasePrice: product.purchasePrice?.toString() || "",
        stock: product.stock.toString(),
        category: product.category,
        brand: product.brand,
      });
    } else if (prefilledBarcode) {
      setFormData((prev) => ({ ...prev, barcode: prefilledBarcode }));
    }
  }, [product, prefilledBarcode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData: Product = {
      id: product?.id || uuidv4(),
      barcode: formData.barcode,
      name: formData.name,
      price: parseFloat(formData.price),
      purchasePrice: formData.purchasePrice
        ? parseFloat(formData.purchasePrice)
        : 0,
      stock: parseInt(formData.stock),
      category: formData.category,
      brand: formData.brand,
      createdAt: product?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(productData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              {product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Barkod *
            </label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 dark:placeholder:text-gray-300 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Barkod numarası"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Adı *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Ürün adı"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fiyat (₺) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stok *
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alış Fiyatı (₺)
            </label>
            <input
              name="purchasePrice"
              type="number"
              value={formData.purchasePrice}
              onChange={handleChange}
              placeholder="Alış Fiyatı (₺)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Kategori girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marka
            </label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Marka adı"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {product ? "Güncelle" : "Kaydet"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors font-medium"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
