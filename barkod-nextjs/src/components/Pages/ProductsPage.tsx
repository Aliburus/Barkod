"use client";
import React, { useState, useMemo, memo } from "react";
import { Product } from "../../types";
import { Search, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";

import { vendorService } from "../../services/vendorService";
import { cartService } from "../../services/cartService";
import useSWR from "swr";
import { useRouter } from "next/navigation";

// Tooltip Component
const Tooltip: React.FC<{ content: string; children: React.ReactNode }> = ({
  content,
  children,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutId) clearTimeout(timeoutId);
    const id = setTimeout(() => {
      setShowTooltip(true);
      setMousePosition({ x: e.clientX, y: e.clientY });
    }, 1000);
    setTimeoutId(id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (showTooltip) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setShowTooltip(false);
  };

  return (
    <div
      className="relative inline-block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {showTooltip && (
        <div
          className="fixed z-[9999] px-3 py-2 text-sm text-white bg-black rounded-lg shadow-xl whitespace-nowrap border border-gray-600"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 40,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

interface ProductsPageProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onView: (product: Product) => void;
  lowStockThreshold?: number;
}

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
            {product.stock === 0 ? "Tükendi" : product.stock + " adet"}
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
          {product.shelf && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200 font-medium">
              {product.shelf}
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
ProductCard.displayName = "ProductCard";

const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  onEdit,
  onDelete,
  lowStockThreshold = 5,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [selectedTool, setSelectedTool] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "created">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const [cartItems, setCartItems] = useState<{ [key: string]: number }>({});

  // Sepetten localStorage'dan yükle
  React.useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const cart = JSON.parse(savedCart);
        const cartItemsMap: { [key: string]: number } = {};
        cart.forEach(
          (item: {
            product: { id?: string; barcode: string };
            productId?: string;
            quantity: number;
          }) => {
            const productId =
              item.product?.id || item.product?.barcode || item.productId;
            if (productId) {
              cartItemsMap[productId] = item.quantity;
            }
          }
        );
        setCartItems(cartItemsMap);
      } catch (error) {
        console.error("Sepet yüklenirken hata:", error);
      }
    }
  }, []);

  // Sepete ekleme/çıkarma fonksiyonu
  const toggleCart = async (product: Product) => {
    try {
      const productId = product.id || product.barcode;
      const newCartItems = { ...cartItems };

      if (newCartItems[productId]) {
        // Sepetten çıkar
        delete newCartItems[productId];
      } else {
        // Sepete ekle
        newCartItems[productId] = 1;
      }

      setCartItems(newCartItems);

      // Veritabanına kaydet
      if (newCartItems[productId]) {
        await cartService.addToCart(product, newCartItems[productId]);
      } else {
        await cartService.removeFromCart(productId);
      }

      // LocalStorage'a da kaydet (fallback için)
      const cartArray = Object.entries(newCartItems)
        .map(([id, quantity]) => ({
          product: products.find((p) => (p.id || p.barcode) === id),
          quantity,
        }))
        .filter((item) => item.product);

      localStorage.setItem("cart", JSON.stringify(cartArray));
    } catch (error) {
      console.error("Sepet işlemi sırasında hata:", error);
    }
  };

  const { data: vendorsData = { vendors: [] } } = useSWR("/api/vendors", () =>
    vendorService.getAll()
  );

  const vendors = vendorsData.vendors || [];

  const getVendorName = (id: string | undefined) => {
    if (!id) return "";
    const found = vendors.find(
      (vendor: any) => vendor._id === id || vendor.id === id
    );
    return found ? found.name : "";
  };
  const router = useRouter();

  const filteredProducts = products
    .filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.category === selectedCategory;
      const matchesVendor =
        !selectedVendor ||
        (() => {
          const supplier = Array.isArray(product.supplier)
            ? product.supplier[0]
            : product.supplier;
          return getVendorName(supplier) === selectedVendor;
        })();
      const matchesBrand = !selectedBrand || product.brand === selectedBrand;
      const matchesTool =
        !selectedTool ||
        (() => {
          if (!product.usedCars || !Array.isArray(product.usedCars)) {
            return false;
          }
          return product.usedCars.some((car) =>
            car.toLowerCase().includes(selectedTool.toLowerCase())
          );
        })();
      const matchesStockFilter =
        stockFilter === "all" ||
        (stockFilter === "low" &&
          product.stock <= lowStockThreshold &&
          product.stock > 0) ||
        (stockFilter === "out" && product.stock === 0);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesVendor &&
        matchesBrand &&
        matchesTool &&
        matchesStockFilter
      );
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

  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))];

  const tools = [
    ...new Set(
      products.flatMap((p) => {
        if (Array.isArray(p.usedCars)) {
          return p.usedCars.filter(Boolean);
        }
        return p.usedCars ? [p.usedCars] : [];
      })
    ),
  ];

  const vendorsList = [
    ...new Set(
      products
        .map((p) => {
          const supplier = Array.isArray(p.supplier)
            ? p.supplier[0]
            : p.supplier;
          return getVendorName(supplier);
        })
        .filter((name) => name !== "")
    ),
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search and Filters Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg border border-blue-200 dark:border-gray-600 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ürün Arama ve Filtreleme
            </h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filtreler
            </span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Search Input - Always Visible */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Arama
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ürün ara (isim, barkod, marka)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
            />
          </div>
        </div>

        {/* Filters - Collapsible */}
        {showFilters && (
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategori
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="">Tüm Kategoriler</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vendor Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tedarikçi
                </label>
                <select
                  value={selectedVendor}
                  onChange={(e) => setSelectedVendor(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="">Tüm Tedarikçiler</option>
                  {vendorsList.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Marka
                </label>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="">Tüm Markalar</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tool Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Araç
                </label>
                <select
                  value={selectedTool}
                  onChange={(e) => setSelectedTool(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="">Tüm Araçlar</option>
                  {tools.map((tool) => (
                    <option key={tool} value={tool}>
                      {tool}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Stock Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stok Durumu
                </label>
                <select
                  value={stockFilter}
                  onChange={(e) =>
                    setStockFilter(e.target.value as "all" | "low" | "out")
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="all">Tüm Ürünler</option>
                  <option value="low">Düşük Stok</option>
                  <option value="out">Stokta Yok</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sıralama
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field as "name" | "price" | "stock" | "created");
                    setSortOrder(order as "asc" | "desc");
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
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
              </div>

              {/* Action Buttons */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                    setSelectedVendor("");
                    setSelectedBrand("");
                    setSelectedTool("");
                    setStockFilter("all");
                    setSortBy("name");
                    setSortOrder("asc");
                    setCurrentPage(1);
                  }}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Filtreleri Temizle
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* YATAY ÜRÜN LİSTESİ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-[5px] w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  İsim
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Barkod
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Firma Adı
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Marka
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Raf
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fiyat
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  OEM
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Kod 1
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Kod 2
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Kullanılan Araçlar
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  İşlemler
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  AF
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    Ürün bulunamadı
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => (
                  <tr
                    key={product.id || product.barcode}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-white min-w-[100px] max-w-[100px] truncate">
                      <Tooltip content={product.name}>
                        <span className="block truncate">{product.name}</span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 font-mono min-w-[70px] max-w-[70px] truncate">
                      <Tooltip content={product.barcode}>
                        <span className="block truncate">
                          {product.barcode}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 min-w-[80px] max-w-[80px] truncate">
                      {Array.isArray(product.supplier) &&
                      product.supplier.length > 0
                        ? (product.supplier ?? []).map((id, i, arr) => (
                            <span
                              key={id}
                              className="underline text-primary-600 cursor-pointer hover:text-primary-800"
                              onClick={() => router.push(`/vendors/${id}`)}
                            >
                              {getVendorName(id)}
                              {i < arr.length - 1 ? ", " : ""}
                            </span>
                          ))
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 min-w-[80px] max-w-[80px] truncate">
                      <Tooltip content={product.category || "-"}>
                        <span className="block truncate">
                          {product.category || "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 min-w-[80px] max-w-[80px] truncate">
                      <Tooltip content={product.brand || "-"}>
                        <span className="block truncate">
                          {product.brand || "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 text-center min-w-[60px] max-w-[60px] truncate">
                      <Tooltip content={product.shelf || "-"}>
                        <span className="block truncate">
                          {product.shelf || "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white text-right min-w-[70px] max-w-[70px]">
                      ₺{product.price?.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-center min-w-[80px] max-w-[80px]">
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
                          : product.stock + " adet"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 text-center min-w-[60px] max-w-[60px] truncate">
                      <Tooltip content={product.oem || "-"}>
                        <span className="block truncate">
                          {product.oem || "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 text-center min-w-[60px] max-w-[60px] truncate">
                      <Tooltip content={product.kod1 || "-"}>
                        <span className="block truncate">
                          {product.kod1 || "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 text-center min-w-[60px] max-w-[60px] truncate">
                      <Tooltip content={product.kod2 || "-"}>
                        <span className="block truncate">
                          {product.kod2 || "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 min-w-[100px] max-w-[100px] truncate">
                      <Tooltip
                        content={
                          Array.isArray(product.usedCars) &&
                          product.usedCars.length > 0
                            ? [...new Set(product.usedCars)].join(", ")
                            : "-"
                        }
                      >
                        <span className="block truncate">
                          {Array.isArray(product.usedCars) &&
                          product.usedCars.length > 0
                            ? [...new Set(product.usedCars)].join(", ")
                            : "-"}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="px-3 py-2 text-xs flex gap-1 min-w-[140px] max-w-[140px]">
                      <button
                        onClick={() => onEdit(product)}
                        className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors text-xs"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => toggleCart(product)}
                        className={`px-2 py-1 rounded transition-colors text-xs flex items-center gap-1 ${
                          cartItems[product.id || product.barcode]
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                        }`}
                        title={
                          cartItems[product.id || product.barcode]
                            ? "Sepetten çıkar"
                            : "Sepete ekle"
                        }
                      >
                        {cartItems[product.id || product.barcode] ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => onDelete(product.barcode)}
                        className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors text-xs"
                      >
                        Sil
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs text-center text-gray-900 dark:text-white min-w-[60px] max-w-[60px]">
                      {product.purchasePrice || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 mt-[10px] pb-[10px]">
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
ProductsPage.displayName = "ProductsPage";
export default ProductsPage;
