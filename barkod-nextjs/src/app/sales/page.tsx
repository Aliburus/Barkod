"use client";
import SalesPage from "../../components/Pages/SalesPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { productService } from "../../services/productService";
import { Product, Sale } from "../../types";
import { useEffect, useState } from "react";
import type { Tab } from "../page";

export default function Page({
  showTotalValue,
  onToggleTotalValue,
}: {
  showTotalValue: boolean;
  onToggleTotalValue: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  useEffect(() => {
    productService.getAll().then(setProducts);
    productService.getAllSales().then(setSales);
  }, []);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        lowStockCount={products.filter((p) => p.stock <= 5).length}
        activeTab={activeTab}
        onAddProduct={() => {}}
        showTotalValue={showTotalValue}
        onToggleTotalValue={onToggleTotalValue}
      />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesPage
          sales={sales}
          products={products}
          showTotalValue={showTotalValue}
        />
      </main>
    </div>
  );
}
