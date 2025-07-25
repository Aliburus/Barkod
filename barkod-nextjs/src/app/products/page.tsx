"use client";
import ProductsPage from "../../components/Pages/ProductsPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { useState } from "react";
import { productService } from "../../services/productService";
import { Product } from "../../types";
import type { Tab } from "../page";
import ProductForm from "../../components/ProductForm";
import useSWR from "swr";
import Notification from "../../components/Layout/Notification";
import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const fetcher = (url: string) =>
  fetch(`${API_URL}${url}`).then((res) => res.json());

export default function Page() {
  const { data: products = [], mutate } = useSWR(
    `${API_URL}/api/products`,
    fetcher,
    { fallbackData: [] }
  );
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string>("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  // useEffect ile veri çekme kaldırıldı
  useEffect(() => {
    const handler = (
      e: CustomEvent<{
        message: string;
        type?: "success" | "error" | "warning" | "info";
      }>
    ) => {
      if (e.detail && e.detail.message) {
        setNotification({
          message: e.detail.message,
          type: e.detail.type ?? "info",
        });
      }
    };
    window.addEventListener("notification", handler as EventListener);
    return () =>
      window.removeEventListener("notification", handler as EventListener);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-xs">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      <Header
        lowStockCount={products.filter((p: Product) => p.stock <= 5).length}
        activeTab={activeTab}
        onAddProduct={() => {
          setEditingProduct(null);
          setShowProductForm(true);
        }}
      />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductsPage
          products={products}
          onEdit={async (product) => {
            setEditingProduct(product);
            setShowProductForm(true);
            // Ürün güncellendikten sonra mutate çağrılacak (ProductForm onSave'de)
          }}
          onDelete={async (barcode) => {
            await productService.deleteProduct(barcode);
            await mutate(); // Ürün silindikten sonra listeyi anlık güncelle
          }}
          onView={() => {}}
        />
      </main>
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          prefilledBarcode={prefilledBarcode}
          onSave={async (product) => {
            try {
              const response = await productService.create(product);
              if (!response || !response.id) {
                throw new Error("Ürün eklenemedi, backend response hatası");
              }
              await mutate();
              setShowProductForm(false);
              setEditingProduct(null);
              setPrefilledBarcode("");
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("notification", {
                    detail: {
                      message: "Ürün başarıyla eklendi",
                      type: "success",
                    },
                  })
                );
              }
            } catch (error: unknown) {
              let msg = "Ürün eklenirken hata oluştu";
              if (
                typeof error === "object" &&
                error !== null &&
                "response" in error &&
                typeof (error as any).response?.data?.error === "string" &&
                (error as any).response.data.error.includes("duplicate key")
              ) {
                msg = "Bu barkod zaten kayıtlı!";
              }
              if (error) console.log("Ürün ekleme hatası:", error);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("notification", {
                    detail: { message: msg, type: "error" },
                  })
                );
              }
            }
          }}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
            setPrefilledBarcode("");
          }}
        />
      )}
    </div>
  );
}
