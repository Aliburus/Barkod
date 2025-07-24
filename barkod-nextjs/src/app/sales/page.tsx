"use client";
import React, { useState, useEffect } from "react";
import SalesPage from "../../components/Pages/SalesPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import type { Tab } from "../page";
import { productService } from "../../services/productService";
import { Product, Sale } from "../../types";

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

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
        showTotalValue={false}
        onToggleTotalValue={() => {}}
      />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesPage sales={sales} products={products} showTotalValue={false} />
      </main>
    </div>
  );
}
