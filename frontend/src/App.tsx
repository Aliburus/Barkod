import React, { useState, useEffect } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import Header from "./components/Layout/Header";
import Navigation from "./components/Layout/Navigation";
import Notification from "./components/Layout/Notification";
import BarcodeScanner from "./components/BarcodeScanner";
import ProductsPage from "./components/Pages/ProductsPage";
import SalesPage from "./components/Pages/SalesPage";
import AnalyticsPage from "./components/Pages/AnalyticsPage";
import ProductForm from "./components/ProductForm";
import SaleModal from "./components/SaleModal";
import { Product, Sale, ScanResult } from "./types";
import { AlertTriangle } from "lucide-react";
import { productService } from "./services/productService";

type Tab = "scanner" | "products" | "sales" | "analytics";

interface NotificationState {
  message: string;
  type: "success" | "error" | "warning" | "info";
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("scanner");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showProductView, setShowProductView] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string>("");
  const [lastScanResult, setLastScanResult] = useState<string>("");
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [showTotalValue, setShowTotalValue] = useState(false);
  const handleToggleTotalValue = () => setShowTotalValue((v) => !v);

  useEffect(() => {
    // İlk açılışta backend'den ürün ve satışları çek
    const fetchData = async () => {
      try {
        const products = await productService.getAll();
        console.log("Ürünler:", products);
        setProducts(Array.isArray(products) ? products : []);
        const sales = await productService.getAllSales();
        setSales(sales);
      } catch (error) {
        setProducts([]);
        setSales([]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Auto-activate scanner when scanner tab is selected
    setScannerActive(activeTab === "scanner");
  }, [activeTab]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success"
  ) => {
    setNotification({ message, type });
  };

  const handleScan = async (result: ScanResult) => {
    const barcode = result.text;
    setLastScanResult(barcode);
    setScannerActive(false); // Modal açılırken taramayı durdur

    try {
      const product = await productService.getProductByBarcode(barcode);
      if (product) {
        setSelectedProduct(product);
        setShowProductView(true);
        setShowProductForm(false);
        setSaleQuantity(1);
        showNotification(`Ürün bulundu: ${product.name}`, "success");
      } else {
        setEditingProduct(null);
        setPrefilledBarcode(barcode);
        setShowProductForm(true);
        setShowProductView(false);
        showNotification("Ürün bulunamadı. Yeni ürün ekleyin.", "warning");
      }
    } catch (error) {
      showNotification("Barkod sorgulanırken hata oluştu", "error");
    }
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      if (editingProduct) {
        await productService.update(product.id, {
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
          brand: product.brand,
        });
        showNotification("Ürün güncellendi", "success");
      } else {
        await productService.create({
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          stock: product.stock,
          category: product.category,
          brand: product.brand,
        });
        showNotification("Yeni ürün eklendi", "success");
      }
      const products = await productService.getAll();
      setProducts(products);
      setShowProductForm(false);
      setEditingProduct(null);
      setPrefilledBarcode("");
    } catch (error) {
      showNotification("Ürün eklenirken/güncellenirken hata oluştu", "error");
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Bu ürünü silmek istediğinizden emin misiniz?")) {
      await productService.deleteProduct(productId);
      const products = await productService.getAll();
      setProducts(products);
      showNotification("Ürün silindi", "success");
    }
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowProductView(true);
  };

  const handleSale = async (sale: Sale) => {
    // TODO: Satış işlemi için backend fonksiyonu ekle
    showNotification("Satış backend entegrasyonu eklenecek", "info");
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setPrefilledBarcode("");
    setShowProductForm(true);
  };

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  useEffect(() => {
    const fetchLowStock = async () => {
      const lowStock = await productService.getLowStockProducts();
      setLowStockProducts(lowStock);
    };
    fetchLowStock();
  }, [products]);

  const handleSaleProduct = async () => {
    if (!selectedProduct) return;
    const quantity = Number(saleQuantity) > 0 ? Number(saleQuantity) : 1;
    if (selectedProduct.stock < quantity) {
      showNotification("Yeterli stok yok!", "error");
      return;
    }
    await productService.createSale({
      barcode: selectedProduct.barcode,
      quantity,
      soldAt: new Date().toISOString(),
      price: selectedProduct.price,
      productName: selectedProduct.name,
    });
    showNotification("Satış kaydedildi ve stok güncellendi", "success");
    setShowProductView(false);
    setSaleQuantity(1);
    const products = await productService.getAll();
    setProducts(products);
    const sales = await productService.getAllSales();
    setSales(sales);
    setSelectedProduct(null);
    setScannerActive(true);
  };

  return (
    <>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
          {/* Header */}
          <Header
            lowStockCount={lowStockProducts.length}
            activeTab={activeTab}
            onAddProduct={handleAddProduct}
            showTotalValue={showTotalValue}
            onToggleTotalValue={handleToggleTotalValue}
          />
          {/* Notification */}
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
          {/* Navigation */}
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === "scanner" && (
              <div className="space-y-6">
                <BarcodeScanner onScan={handleScan} isActive={scannerActive} />
                {/* Son taranan barkod kutusu ve ilgili kodu kaldır */}
                {lowStockProducts.length > 0 && (
                  <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-4">
                    <h3 className="font-medium text-warning-800 dark:text-warning-300 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Kritik Stok Uyarısı
                    </h3>
                    <div className="space-y-2">
                      {lowStockProducts.slice(0, 5).map((product) => (
                        <div
                          key={product.id}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-warning-700 dark:text-warning-300">
                            {product.name}
                          </span>
                          <span className="text-warning-600 dark:text-warning-400 font-medium">
                            {product.stock} adet
                          </span>
                        </div>
                      ))}
                      {lowStockProducts.length > 5 && (
                        <p className="text-warning-600 dark:text-warning-400 text-sm">
                          +{lowStockProducts.length - 5} ürün daha...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "products" && (
              <ProductsPage
                products={Array.isArray(products) ? products : []}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onView={handleViewProduct}
                showTotalValue={showTotalValue}
                onToggleTotalValue={handleToggleTotalValue}
              />
            )}

            {activeTab === "sales" && (
              <SalesPage
                sales={sales}
                products={products}
                showTotalValue={showTotalValue}
                onToggleTotalValue={handleToggleTotalValue}
              />
            )}

            {activeTab === "analytics" && (
              <AnalyticsPage
                products={products}
                sales={sales}
                showTotalValue={showTotalValue}
                onToggleTotalValue={handleToggleTotalValue}
              />
            )}
          </main>
        </div>
      </ThemeProvider>
      {/* Modallar her durumda overlay olarak görünür */}
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          prefilledBarcode={prefilledBarcode}
          onSave={handleSaveProduct}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
            setPrefilledBarcode("");
            setScannerActive(true);
            setShowProductView(false);
          }}
        />
      )}
      {showProductView && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pt-safe-top pb-safe-bottom">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => {
                setShowProductView(false);
                setScannerActive(true);
                setSaleQuantity(1);
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Ürün Bilgileri
            </h2>
            <div className="space-y-2 text-gray-800 dark:text-gray-200">
              <div>
                <b>Barkod:</b> {selectedProduct.barcode}
              </div>
              <div>
                <b>Adı:</b> {selectedProduct.name}
              </div>
              <div>
                <b>Fiyat:</b> {selectedProduct.price} ₺
              </div>
              <div>
                <b>Stok:</b> {selectedProduct.stock}
              </div>
              <div>
                <b>Kategori:</b> {selectedProduct.category}
              </div>
              <div>
                <b>Marka:</b> {selectedProduct.brand}
              </div>
              {selectedProduct.stock === 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setEditingProduct(selectedProduct);
                      setShowProductForm(true);
                      setShowProductView(false);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors font-medium"
                  >
                    Güncelle
                  </button>
                </div>
              )}
              {selectedProduct.stock > 0 && (
                <div className="flex items-center gap-2 mt-4">
                  <label className="font-medium">Adet:</label>
                  <button
                    onClick={() => setSaleQuantity((q) => Math.max(1, q - 1))}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={selectedProduct.stock}
                    value={saleQuantity}
                    onChange={(e) =>
                      setSaleQuantity(
                        Math.max(
                          1,
                          Math.min(
                            selectedProduct.stock,
                            Number(e.target.value)
                          )
                        )
                      )
                    }
                    className="w-16 text-center border rounded bg-white dark:bg-gray-800"
                  />
                  <button
                    onClick={() =>
                      setSaleQuantity((q) =>
                        Math.min(selectedProduct.stock, q + 1)
                      )
                    }
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                  >
                    +
                  </button>
                  <button
                    onClick={handleSaleProduct}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                  >
                    Sat
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
