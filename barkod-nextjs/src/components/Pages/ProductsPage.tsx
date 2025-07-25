"use client";
import React, { useState, useMemo, memo } from "react";
import { Product } from "../../types";
import {
  Search,
  Package,
  AlertTriangle,
  Grid,
  List,
  Edit2,
  Check,
} from "lucide-react";
import { productService } from "../../services/productService";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

interface ProductsPageProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
  lowStockThreshold?: number;
}

// Yeni modal component
const ProductDetailModal: React.FC<{
  product: Product;
  onClose: () => void;
}> = ({ product, onClose }) => {
  const formatDateTime = (dateStr: string) => {
    return format(parseISO(dateStr), "dd MMMM yyyy HH.mm", { locale: tr });
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Kapat
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white text-center">
          Ürün Detayları
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-2">
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              İsim
            </span>
            <span className="text-gray-900 dark:text-white break-words">
              {product.name}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Barkod
            </span>
            <span className="text-gray-900 dark:text-white break-words">
              {product.barcode}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Fiyat
            </span>
            <span className="text-gray-900 dark:text-white">
              {product.price} ₺
            </span>
            {typeof product.purchasePrice === "number" && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                (Alış: {product.purchasePrice} ₺)
              </span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Stok
            </span>
            <span className="text-gray-900 dark:text-white">
              {product.stock}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Marka
            </span>
            <span className="text-gray-900 dark:text-white">
              {product.brand}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Kategori
            </span>
            <span className="text-gray-900 dark:text-white">
              {product.category}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Eklenme Tarihi
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatDateTime(product.createdAt)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Güncellenme Tarihi
            </span>
            <span className="text-gray-900 dark:text-white">
              {formatDateTime(product.updatedAt)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Alış Fiyatı
            </span>
            <span className="text-gray-900 dark:text-white">
              {product.purchasePrice} ₺
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = memo(
  ({
    product,
    onEdit,
    onDelete,
    onView,
    lowStockThreshold,
  }: {
    product: Product;
    onEdit: (p: Product) => void;
    onDelete: (id: string) => void;
    onView: (p: Product) => void;
    lowStockThreshold: number;
  }) => (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-5 flex flex-col justify-between border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group min-h-[180px]">
      <div className="flex-1">
        <div className="font-bold text-base text-gray-900 dark:text-white mb-1 truncate">
          {product.name}
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-mono">
          {product.barcode}
        </div>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
            ₺{product.price}
          </span>
          {typeof product.purchasePrice === "number" &&
            product.purchasePrice > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                Alış: ₺{product.purchasePrice}
              </span>
            )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              product.stock === 0
                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                : product.stock <= lowStockThreshold
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
            }`}
          >
            {product.stock === 0
              ? "Tükendi"
              : product.stock <= lowStockThreshold
              ? "Az Stok"
              : product.stock + " adet"}
          </span>
          {product.category && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-medium">
              {product.category}
            </span>
          )}
          {product.brand && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200 font-medium">
              {product.brand}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-5">
        <button
          onClick={() => onView(product)}
          className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
        >
          Görüntüle
        </button>
        <button
          onClick={() => onEdit(product)}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Düzenle
        </button>
        <button
          onClick={() => onDelete(product.barcode)}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
        >
          Sil
        </button>
      </div>
    </div>
  )
);

function ProductSkeleton() {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow p-5 flex flex-col justify-between border border-gray-100 dark:border-gray-800 animate-pulse min-h-[180px]">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
      <div className="flex gap-2 mt-5">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
      </div>
    </div>
  );
}

const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  onEdit,
  onDelete,
  onView,
  lowStockThreshold = 5,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "created">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "low" &&
          product.stock <= lowStockThreshold &&
          product.stock > 0) ||
        (stockFilter === "out" && product.stock === 0);
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case "price":
          aValue = a.price;
          bValue = b.price;
          break;
        case "stock":
          aValue = a.stock;
          bValue = b.stock;
          break;
        case "created":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(
    () =>
      filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredProducts, currentPage, itemsPerPage]
  );

  const categories = [
    ...new Set(products.map((p) => p.category).filter(Boolean)),
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const stats = {
    total: products.length,
    lowStock: products.filter(
      (p) => p.stock <= lowStockThreshold && p.stock > 0
    ).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Ürün
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <Package className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Az Stok
              </p>
              <p className="text-2xl font-bold text-warning-600">
                {stats.lowStock}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tükenen
              </p>
              <p className="text-2xl font-bold text-danger-600">
                {stats.outOfStock}
              </p>
            </div>
            <Package className="w-8 h-8 text-danger-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Değer
              </p>
              <p className="text-2xl font-bold text-success-600">
                {formatPrice(stats.totalValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Ürün ara (isim, barkod, marka)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) =>
              setStockFilter(e.target.value as "all" | "low" | "out")
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Tüm Stoklar</option>
            <option value="low">Az Stok</option>
            <option value="out">Tükenen</option>
          </select>

          {/* Sort */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split("-");
              setSortBy(field as "name" | "price" | "stock" | "created");
              setSortOrder(order as "asc" | "desc");
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name-asc">İsim A-Z</option>
            <option value="name-desc">İsim Z-A</option>
            <option value="price-asc">Fiyat Düşük-Yüksek</option>
            <option value="price-desc">Fiyat Yüksek-Düşük</option>
            <option value="stock-asc">Stok Az-Çok</option>
            <option value="stock-desc">Stok Çok-Az</option>
            <option value="created-desc">Yeni Eklenen</option>
            <option value="created-asc">Eski Eklenen</option>
          </select>

          {/* View Mode */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 ${
                viewMode === "grid"
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              } transition-colors`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 ${
                viewMode === "list"
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
              } transition-colors`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Display */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Ürün Listesi ({filteredProducts.length})
          </h2>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Ürün bulunamadı</p>
            <p className="text-gray-400 text-sm">
              Yeni ürün eklemek için barkod tarayın veya menüden ekleyin.
            </p>
          </div>
        ) : (
          <>
            {isValidating ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id || product.barcode}
                    product={product}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={(p) => setDetailProduct(p)}
                    lowStockThreshold={lowStockThreshold}
                  />
                ))}
              </div>
            )}
            {/* Sayfalama */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  Önceki
                </button>
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
                >
                  Sonraki
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}
    </div>
  );
};

export default ProductsPage;
