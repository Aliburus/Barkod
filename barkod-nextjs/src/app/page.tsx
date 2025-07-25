"use client";
import React, { useState, useEffect } from "react";
import ProductsPage from "../components/Pages/ProductsPage";
import SalesPage from "../components/Pages/SalesPage";
import AnalyticsPage from "../components/Pages/AnalyticsPage";
import Header from "../components/Layout/Header";
import Navigation from "../components/Layout/Navigation";
import BarcodeScanner from "../components/BarcodeScanner";
import Notification from "../components/Layout/Notification";
import ProductForm from "../components/ProductForm";
import SaleModal from "../components/SaleModal";
import { productService } from "../services/productService";
import { Product, Sale, ScanResult } from "../types";
import type { Expense } from "../services/expenseService";
import PaymentsPage from "../components/Pages/PaymentsPage";
import { Loader2 } from "lucide-react";
import KasaPage from "./kasa/page";
import GiderlerPage from "./giderler/page";
import ExcelJS from "exceljs";
import type { Row } from "exceljs";

export type Tab =
  | "scanner"
  | "products"
  | "sales"
  | "customers"
  | "payments"
  | "analytics"
  | "kasa"
  | "giderler";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("scanner");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  // showTotalValue state'ini localStorage'dan kaldır, sadece useState ile tut

  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [giderler] = useState<Expense[]>([]); // any kaldırıldı

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const products = await productService.getAll();
        setProducts(Array.isArray(products) ? products : []);
        const sales = await productService.getAllSales();
        setSales(sales);
      } catch {
        setProducts([]);
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Aktif tab kasa olduğunda sales tekrar çek
  useEffect(() => {
    if (activeTab === "kasa") {
      productService.getAllSales().then(setSales);
    }
  }, [activeTab]);

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

  // handleDeleteProduct fonksiyonu kullanılmıyor, kaldırıldı

  const handleSaveProduct = async (product: Product) => {
    try {
      if (editingProduct) {
        await productService.update(product.barcode, product);
        showNotification("Ürün güncellendi", "success");
      } else {
        await productService.create(product);
        showNotification("Yeni ürün eklendi", "success");
      }
      const products = await productService.getAll();
      setProducts(products);
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
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    worksheet.eachRow((row: Row, rowNumber: number) => {
      if (rowNumber === 1) return; // başlık satırı
      const values = Array.isArray(row.values) ? row.values : [];
      const [barcode, name, price, stock, category, brand] = values.slice(1);
      if (!barcode || !name) return;
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
    });
    alert("Toplu ürün ekleme tamamlandı!");
  };

  const handleScan = async (result: ScanResult) => {
    const barcode = result.text;
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
        showNotification("Ürün bulunamadı", "warning");
      }
    } catch {
      showNotification("Barkod sorgulanırken hata oluştu", "error");
    }
  };

  const handleSale = async (sale: Sale) => {
    if (sale.price === undefined) return;
    try {
      const saleCreate = {
        barcode: sale.barcode,
        quantity: sale.quantity,
        soldAt: new Date().toISOString(), // Satış tarihi otomatik olarak şimdi
        price: sale.price as number,
        productName: sale.productName || "",
        customer: sale.customer,
        paymentType: sale.paymentType,
      };
      await productService.createSale(saleCreate);
      showNotification("Satış kaydedildi ve stok güncellendi", "success");
      setShowSaleModal(false);
      try {
        const products = await productService.getAll();
        setProducts(products);
      } catch {
        console.log("Ürün listesi alınamadı");
      }
      try {
        const sales = await productService.getAllSales();
        setSales(sales);
      } catch {
        console.log("Satış listesi alınamadı");
      }
      setSelectedProduct(null);
      setScannerActive(true);
    } catch (error) {
      let msg = "Satış kaydedilirken hata oluştu";
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
      ) {
        msg = (error as { message?: string }).message || msg;
      }
      showNotification(msg, "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-16 h-16 animate-spin text-primary-600 dark:text-primary-400" />
        </div>
      ) : (
        <>
          <Header
            lowStockCount={
              products.filter((p) => p.stock <= 5 && p.stock > 0).length
            }
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
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === "products" && (
              <ProductsPage
                products={products}
                onEdit={handleEditProduct}
                onDelete={() => {}}
                onView={setSelectedProduct}
              />
            )}
            {activeTab === "sales" && (
              <SalesPage sales={sales} products={products} />
            )}
            {activeTab === "analytics" && (
              <AnalyticsPage
                products={products}
                sales={sales}
                payments={[]}
                customers={[]}
                expenses={giderler}
              />
            )}
            {activeTab === "scanner" && (
              <BarcodeScanner onScan={handleScan} isActive={scannerActive} />
            )}
            {activeTab === "payments" && <PaymentsPage />}
            {activeTab === "kasa" && <KasaPage />}
            {activeTab === "giderler" && <GiderlerPage />}
          </main>
          {showProductForm && (
            <ProductForm
              product={editingProduct}
              prefilledBarcode={prefilledBarcode || ""}
              onSave={async (product) => {
                try {
                  await productService.create(product);
                  const products = await productService.getAll();
                  setProducts(products);
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
                    typeof (error as { message?: string }).message ===
                      "string" &&
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
                onSale={handleSale}
                onClose={() => {
                  setShowSaleModal(false);
                  setSelectedProduct(null);
                  setScannerActive(true);
                }}
              />
            )}
        </>
      )}
    </div>
  );
}
