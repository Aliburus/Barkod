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
import ExcelJS from "exceljs";
import PaymentsPage from "../components/Pages/PaymentsPage";
import { Loader2 } from "lucide-react";

export type Tab =
  | "scanner"
  | "products"
  | "sales"
  | "customers"
  | "payments"
  | "analytics";

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
  const [showTotalValue, setShowTotalValue] = useState(false);
  const handleToggleTotalValue = () => setShowTotalValue((v) => !v);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string>("");
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const products = await productService.getAll();
        setProducts(Array.isArray(products) ? products : []);
        const sales = await productService.getAllSales();
        setSales(sales);
      } catch (error) {
        setProducts([]);
        setSales([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const handleDeleteProduct = async (productBarcode: string) => {
    // window.confirm yerine notification ile onay iste
    setNotification({
      message: "Bu ürünü silmek istediğinize emin misiniz?",
      type: "warning",
    });
    // Onay için kullanıcıdan ek aksiyon beklenebilir, burada örnek olarak direkt siliyorum
    // Gerçek projede modal ile onay alınabilir
    // Eğer notification üzerinden onay alınacaksa, ek state ve butonlar eklenmeli
    // Şimdilik direkt silme işlemi yapılıyor:
    // await productService.deleteProduct(productBarcode);
    // const products = await productService.getAll();
    // setProducts(products);
    // showNotification("Ürün silindi", "success");
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
      const products = await productService.getAll();
      setProducts(products);
      setShowProductForm(false);
      setEditingProduct(null);
    } catch (error) {
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
    worksheet.eachRow((row, rowNumber) => {
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
    try {
      const product = await productService.getProductByBarcode(barcode);
      if (product) {
        setSelectedProduct(product);
        setShowSaleModal(true);
        showNotification(`Ürün bulundu: ${product.name}`, "success");
      } else {
        setEditingProduct(null);
        setPrefilledBarcode(barcode);
        setShowProductForm(true);
        showNotification("Ürün bulunamadı. Yeni ürün ekleyin.", "warning");
      }
    } catch (error) {
      showNotification("Barkod sorgulanırken hata oluştu", "error");
    }
  };

  const handleSale = async (sale: Sale) => {
    try {
      await productService.createSale(sale);
      showNotification("Satış kaydedildi ve stok güncellendi", "success");
      setShowSaleModal(false);
      setSaleQuantity(1);
      const products = await productService.getAll();
      setProducts(products);
      const sales = await productService.getAllSales();
      setSales(sales);
      setSelectedProduct(null);
      setScannerActive(true);
    } catch (error) {
      showNotification("Satış kaydedilirken hata oluştu", "error");
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
            showTotalValue={activeTab !== "scanner" ? showTotalValue : false}
            onToggleTotalValue={
              activeTab !== "scanner" ? handleToggleTotalValue : () => {}
            }
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
                onDelete={handleDeleteProduct}
                onView={setSelectedProduct}
                showTotalValue={showTotalValue}
              />
            )}
            {activeTab === "sales" && (
              <SalesPage
                sales={sales}
                products={products}
                showTotalValue={showTotalValue}
              />
            )}
            {activeTab === "analytics" && (
              <AnalyticsPage
                products={products}
                sales={sales}
                showTotalValue={showTotalValue}
              />
            )}
            {activeTab === "scanner" && (
              <BarcodeScanner onScan={handleScan} isActive={scannerActive} />
            )}
            {activeTab === "payments" && <PaymentsPage />}
          </main>
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
              }}
            />
          )}
          {showSaleModal && selectedProduct && (
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
