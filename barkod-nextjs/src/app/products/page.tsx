"use client";
import ProductsPage from "../../components/Pages/ProductsPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { useEffect, useState } from "react";
import { productService } from "../../services/productService";
import { Product } from "../../types";
import type { Tab } from "../page";
import ProductForm from "../../components/ProductForm";

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prefilledBarcode, setPrefilledBarcode] = useState<string>("");
  useEffect(() => {
    productService.getAll().then(setProducts);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        lowStockCount={products.filter((p) => p.stock <= 5).length}
        activeTab={activeTab}
        onAddProduct={() => {
          setEditingProduct(null);
          setShowProductForm(true);
        }}
        showTotalValue={true}
        onToggleTotalValue={() => {}}
      />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductsPage
          products={products}
          onEdit={() => {}}
          onDelete={() => {}}
          onView={() => {}}
          showTotalValue={true}
        />
      </main>
      {showProductForm && (
        <ProductForm
          product={editingProduct}
          prefilledBarcode={prefilledBarcode}
          onSave={() => setShowProductForm(false)}
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
