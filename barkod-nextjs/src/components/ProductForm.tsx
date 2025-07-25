"use client";
import React, { useState, useEffect } from "react";
import { Product } from "../types";
import { Save, X, Package } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { companyService } from "../services/companyService";
import { Plus } from "lucide-react";

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
    oem: "",
    kod1: "",
    kod2: "",
    usedCars: "",
  });
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [companySearch, setCompanySearch] = useState("");

  useEffect(() => {
    companyService.getAll().then(setCompanies);
  }, []);

  useEffect(() => {
    if (product && product.supplier) {
      setSelectedCompanies(
        Array.isArray(product.supplier) ? product.supplier : [product.supplier]
      );
    }
    if (product) {
      setFormData({
        barcode: product.barcode,
        name: product.name,
        price:
          product.price !== undefined && product.price !== null
            ? product.price.toString()
            : "",
        purchasePrice:
          product.purchasePrice !== undefined && product.purchasePrice !== null
            ? product.purchasePrice.toString()
            : "",
        stock:
          product.stock !== undefined && product.stock !== null
            ? product.stock.toString()
            : "",
        category: product.category,
        brand: product.brand,
        oem: product.oem || "",
        kod1: product.kod1 || "",
        kod2: product.kod2 || "",
        usedCars: product.usedCars ? product.usedCars.join(", ") : "",
      });
    } else if (prefilledBarcode) {
      setFormData((prev) => ({ ...prev, barcode: prefilledBarcode }));
    } else {
      setFormData((prev) => ({ ...prev, barcode: "" }));
    }
  }, [product, prefilledBarcode]);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim()) return;
    await companyService.create(newCompany);
    setShowCompanyModal(false);
    setNewCompany({ name: "", phone: "", address: "" });
    companyService.getAll().then(setCompanies);
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setSelectedCompanies(options);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompanies.length) {
      alert("Lütfen en az bir firma seçiniz!");
      return;
    }
    setLoading(true);
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
      supplier: selectedCompanies,
      oem: formData.oem,
      kod1: formData.kod1,
      kod2: formData.kod2,
      usedCars: formData.usedCars
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      createdAt: product?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    console.log("productData submit:", productData);
    await onSave(productData);
    setLoading(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (e.target.name === "barcode") {
      setFormData({
        ...formData,
        barcode: e.target.value.toUpperCase(),
      });
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value,
      });
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-8 relative flex flex-col gap-4">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Kapat
        </button>
        <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center w-full">
          {product ? "Ürün Düzenle" : "Yeni Ürün Ekle"}
        </h2>
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full"
        >
          <div className="flex flex-col gap-3">
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
                OEM
              </label>
              <input
                type="text"
                name="oem"
                value={formData.oem}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="OEM kodu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kod 1
              </label>
              <input
                type="text"
                name="kod1"
                value={formData.kod1}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Kod 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kod 2
              </label>
              <input
                type="text"
                name="kod2"
                value={formData.kod2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Kod 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kullanılan Araçlar
              </label>
              <input
                type="text"
                name="usedCars"
                value={formData.usedCars}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-700 placeholder:font-medium bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Araçları virgül ile ayırın (ör: Doblo, Fiorino, Transit)"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Firma
              </label>
              <div className="text-xs text-gray-500 mb-1">
                Firma ara ve birden fazla seç
              </div>
              <input
                type="text"
                placeholder="Firma ara..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white mb-1"
              />
              <div className="border border-gray-300 rounded-md bg-white dark:bg-gray-800 max-h-32 overflow-y-auto">
                {filteredCompanies.length === 0 && (
                  <span className="p-2 text-gray-400 text-sm">
                    Firma bulunamadı
                  </span>
                )}
                {filteredCompanies.map((c) => (
                  <label
                    key={c._id}
                    className="flex items-center px-2 py-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(c._id)}
                      onChange={() => {
                        if (selectedCompanies.includes(c._id)) {
                          setSelectedCompanies(
                            selectedCompanies.filter((id) => id !== c._id)
                          );
                        } else {
                          setSelectedCompanies([...selectedCompanies, c._id]);
                        }
                      }}
                      className="mr-2"
                    />
                    {c.name}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowCompanyModal(true)}
                className="bg-primary-600 text-white px-2 py-2 rounded hover:bg-primary-700 flex items-center mt-2"
                title="Firma Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex gap-3 pt-4 col-span-1 md:col-span-2 lg:col-span-3 justify-center">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md transition-colors font-medium flex items-center justify-center gap-2 ${
                loading ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700"
              }`}
            >
              <Save className="w-4 h-4" />
              {loading ? "Kaydediliyor..." : product ? "Güncelle" : "Kaydet"}
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
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl p-8 relative flex flex-col sm:flex-row gap-8">
            <button
              onClick={() => setShowCompanyModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <div className="flex-1 flex flex-col justify-center">
              <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center sm:text-left">
                Firma Ekle
              </h2>
              <form
                onSubmit={handleAddCompany}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <input
                  name="name"
                  value={newCompany.name}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, name: e.target.value })
                  }
                  placeholder="Firma Adı"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                <input
                  name="phone"
                  value={newCompany.phone}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, phone: e.target.value })
                  }
                  placeholder="Telefon"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  name="address"
                  value={newCompany.address}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, address: e.target.value })
                  }
                  placeholder="Adres"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white col-span-1 sm:col-span-2"
                />
                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold col-span-1 sm:col-span-2"
                >
                  Ekle
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductForm;
