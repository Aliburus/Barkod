"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { X, Package, ArrowLeft } from "lucide-react";
import { companyService } from "../../../services/companyService";
import { productService } from "../../../services/productService";
import { Product } from "../../../types";

interface Company {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  _id?: string;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Ürünler için filtreleme ve sıralama state'leri
  const [productStartDate, setProductStartDate] = useState("");
  const [productEndDate, setProductEndDate] = useState("");
  const [productSort, setProductSort] = useState("date_desc");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        console.log("Firma ID:", id);

        // Firma bilgilerini çek
        const data = await companyService.getById(id);
        console.log("Firma verisi:", data);
        setCompany(data);

        // Ürünleri çek
        const allProducts = await productService.getAll();
        console.log("Tüm ürünler:", allProducts.length);

        // Ürünleri filtrele (hem firma adına hem ID'sine göre)
        const filteredProducts = allProducts.filter((p) => {
          const hasSupplier =
            Array.isArray(p.supplier) && p.supplier.length > 0;
          if (!hasSupplier) return false;
          const matchesName = p.supplier!.includes(data.name);
          const matchesId = p.supplier!.includes(id);
          console.log(
            `Ürün: ${p.name}, Supplier: ${p.supplier}, Firma: ${
              data.name
            }, ID: ${id}, Eşleşme: ${matchesName || matchesId}`
          );
          return matchesName || matchesId;
        });

        console.log("Filtrelenmiş ürünler:", filteredProducts.length);
        setProducts(filteredProducts);
      } catch (error) {
        console.error("Veri çekilirken hata:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  // Ürünleri sırala
  const sortedProducts = [...products].sort((a, b) => {
    if (productSort === "date_desc")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (productSort === "date_asc")
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (productSort === "name_asc") return a.name.localeCompare(b.name);
    if (productSort === "name_desc") return b.name.localeCompare(a.name);
    if (productSort === "price_desc") return b.price - a.price;
    if (productSort === "price_asc") return a.price - b.price;
    return 0;
  });

  // Ürünleri filtrele
  const filteredProducts = sortedProducts.filter((p) => {
    if (!productStartDate && !productEndDate) return true;
    const productDate = new Date(p.createdAt);
    if (productStartDate && productDate < new Date(productStartDate))
      return false;
    if (productEndDate && productDate > new Date(productEndDate + "T23:59:59"))
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Firma bulunamadı
            </h1>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Geri Dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {company.name}
            </h1>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Firma Bilgileri
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Ad:</span> {company.name}
                  </p>
                  {company.phone && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Telefon:</span>{" "}
                      {company.phone}
                    </p>
                  )}
                  {company.address && (
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Adres:</span>{" "}
                      {company.address}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  İstatistikler
                </h3>
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Toplam Ürün:</span>{" "}
                    {products.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ürünler Bölümü */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" />
                Ürünler ({filteredProducts.length})
              </h2>
            </div>

            {/* Filtreler */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={productStartDate}
                  onChange={(e) => setProductStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={productEndDate}
                  onChange={(e) => setProductEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sıralama
                </label>
                <select
                  value={productSort}
                  onChange={(e) => setProductSort(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="date_desc">Tarih (Yeni)</option>
                  <option value="date_asc">Tarih (Eski)</option>
                  <option value="name_asc">İsim (A-Z)</option>
                  <option value="name_desc">İsim (Z-A)</option>
                  <option value="price_desc">Fiyat (Yüksek)</option>
                  <option value="price_asc">Fiyat (Düşük)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ürün Listesi */}
          <div className="p-6">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Bu firmaya ait ürün bulunamadı
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.barcode}
                    onClick={() => handleProductClick(product)}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                        {product.name}
                      </h3>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {product.barcode}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <p>Fiyat: ₺{product.price}</p>
                      <p>Stok: {product.stock}</p>
                      <p>Kategori: {product.category}</p>
                      <p>Marka: {product.brand}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ürün Detay Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ürün Detayı
              </h3>
              <button
                onClick={closeProductModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  İsim:
                </span>
                <p className="text-gray-900 dark:text-white">
                  {selectedProduct.name}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Barkod:
                </span>
                <p className="text-gray-900 dark:text-white">
                  {selectedProduct.barcode}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Fiyat:
                </span>
                <p className="text-gray-900 dark:text-white">
                  ₺{selectedProduct.price}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Stok:
                </span>
                <p className="text-gray-900 dark:text-white">
                  {selectedProduct.stock}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Kategori:
                </span>
                <p className="text-gray-900 dark:text-white">
                  {selectedProduct.category}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Marka:
                </span>
                <p className="text-gray-900 dark:text-white">
                  {selectedProduct.brand}
                </p>
              </div>
              {selectedProduct.purchasePrice && (
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Alış Fiyatı:
                  </span>
                  <p className="text-gray-900 dark:text-white">
                    ₺{selectedProduct.purchasePrice}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
