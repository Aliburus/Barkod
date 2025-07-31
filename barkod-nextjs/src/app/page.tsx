"use client";
import React, { useState, useEffect, Suspense, lazy } from "react";
import Header from "../components/Layout/Header";
import Navigation from "../components/Layout/Navigation";
import BarcodeScanner from "../components/BarcodeScanner";
import Notification from "../components/Layout/Notification";
import ProductForm from "../components/ProductForm";
import SaleModal from "../components/SaleModal";
import { productService } from "../services/productService";
import { Product, ScanResult } from "../types";

import { Loader2, Search } from "lucide-react";

// Lazy load heavy components
const ProductsPage = lazy(() => import("../components/Pages/ProductsPage"));
const SalesPage = lazy(() => import("../components/Pages/SalesPage"));
const AnalyticsPage = lazy(() => import("../components/Pages/AnalyticsPage"));

const GiderlerPage = lazy(() => import("./giderler/page"));
const RefundsPage = lazy(() => import("./refunds/page"));

export type Tab =
  | "scanner"
  | "products"
  | "sales"
  | "customers"
  | "analytics"
  | "giderler"
  | "sepet"
  | "vendors"
  | "refunds";

// Loading component for lazy loaded components
const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-2" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        Sayfa yükleniyor...
      </p>
    </div>
  </div>
);

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("scanner");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannerActive, setScannerActive] = useState(true);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string>("");
  const [scanLoading, setScanLoading] = useState(false);

  useEffect(() => {
    setScannerActive(activeTab === "scanner");
  }, [activeTab]);

  const showNotification = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "success"
  ) => {
    setNotification({ message, type });
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleSaveProduct = async (product: Product) => {
    try {
      if (editingProduct) {
        await productService.update(product.barcode, product);
        showNotification("Ürün güncellendi", "success");
      } else {
        await productService.create(product);
        showNotification("Yeni ürün eklendi", "success");
      }
      setShowProductForm(false);
      setEditingProduct(null);
    } catch {
      showNotification("Ürün eklenirken/güncellenirken hata oluştu", "error");
    }
  };

  // Toplu ürün ekleme fonksiyonu
  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { default: ExcelJS } = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const worksheet = workbook.worksheets[0];

      let successCount = 0;
      let errorCount = 0;

      worksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return; // başlık satırı
        const values = Array.isArray(row.values) ? row.values : [];
        const [barcode, name, price, stock, category, brand] = values.slice(1);
        if (!barcode || !name) return;

        try {
          handleSaveProduct({
            id: "",
            barcode: typeof barcode === "string" ? barcode : String(barcode),
            name: typeof name === "string" ? name : String(name),
            price: parseFloat(
              price !== undefined && price !== null ? price.toString() : "0"
            ),
            stock: parseInt(
              stock !== undefined && stock !== null ? stock.toString() : "0"
            ),
            category: category?.toString() || "",
            brand: brand?.toString() || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          successCount++;
        } catch {
          errorCount++;
        }
      });

      showNotification(
        `Toplu yükleme tamamlandı! Başarılı: ${successCount}, Hata: ${errorCount}`,
        errorCount > 0 ? "warning" : "success"
      );
    } catch {
      showNotification("Excel dosyası okunamadı", "error");
    }
  };

  const handleScan = async (result: ScanResult) => {
    const barcode = result.text;
    setScanLoading(true);
    setScannerActive(false);

    // Önce tüm modal state'lerini kapat
    setShowSaleModal(false);
    setShowProductForm(false);
    setEditingProduct(null);
    setSelectedProduct(null);
    setPrefilledBarcode("");

    try {
      const product = await productService.getProductByBarcode(barcode);
      if (product && product.name) {
        setSelectedProduct(product);
        setShowSaleModal(true);
        showNotification(`Ürün bulundu: ${product.name}`, "success");
      } else {
        setEditingProduct(null);
        setPrefilledBarcode(barcode);
        setShowProductForm(true);
        showNotification(
          "Ürün bulunamadı, yeni ürün ekleyebilirsiniz",
          "warning"
        );
      }
    } catch {
      showNotification("Barkod sorgulanırken hata oluştu", "error");
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        activeTab={activeTab}
        onAddProduct={() => {
          setEditingProduct(null);
          setShowProductForm(true);
        }}
        onBulkUpload={handleBulkUpload}
      />
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />
      <main className="">
        <Suspense fallback={<PageLoader />}>
          {activeTab === "products" && (
            <ProductsPage
              onEdit={handleEditProduct}
              onDelete={() => {}}
              onView={setSelectedProduct}
            />
          )}
          {activeTab === "sales" && <SalesPage />}
          {activeTab === "analytics" && <AnalyticsPage />}
          {activeTab === "scanner" && (
            <div className="relative">
              {scanLoading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      Ürün aranıyor...
                    </p>
                  </div>
                </div>
              )}
              <BarcodeScanner onScan={handleScan} isActive={scannerActive} />
            </div>
          )}

          {activeTab === "giderler" && <GiderlerPage />}
          {activeTab === "refunds" && <RefundsPage />}
        </Suspense>
      </main>
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          prefilledBarcode={prefilledBarcode || ""}
          onSave={async (product) => {
            try {
              await productService.create(product);
              setShowProductForm(false);
              setEditingProduct(null);
              setPrefilledBarcode("");
              setScannerActive(true);
              showNotification("Ürün başarıyla eklendi", "success");
            } catch (error) {
              let msg = "Ürün eklenirken hata oluştu";
              if (
                typeof error === "object" &&
                error !== null &&
                "message" in error &&
                typeof (error as { message?: string }).message === "string" &&
                (error as { message?: string }).message?.includes(
                  "duplicate key"
                )
              ) {
                msg = "Bu barkod zaten kayıtlı!";
              }
              setShowProductForm(false);
              setEditingProduct(null);
              setPrefilledBarcode("");
              setScannerActive(true);
              showNotification(msg, "error");
            }
          }}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
            setPrefilledBarcode("");
            setScannerActive(true);
          }}
        />
      )}
      {showSaleModal &&
        selectedProduct &&
        selectedProduct.price !== undefined &&
        selectedProduct.stock !== undefined && (
          <SaleModal
            product={selectedProduct}
            onAddToCart={(product, quantity) => {
              // Sepete ekleme işlemi burada yapılacak
              console.log("Ürün sepete eklendi:", product, quantity);
              setShowSaleModal(false);
              setSelectedProduct(null);
              setScannerActive(true);
            }}
            onClose={() => {
              setShowSaleModal(false);
              setSelectedProduct(null);
              setScannerActive(true);
            }}
          />
        )}
    </div>
  );
}
