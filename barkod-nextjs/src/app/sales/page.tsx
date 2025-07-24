"use client";
import React, { useState } from "react";
import SalesPage from "../../components/Pages/SalesPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import type { Tab } from "../page";

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("sales");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        lowStockCount={0}
        activeTab={activeTab}
        onAddProduct={() => {}}
        showTotalValue={false}
        onToggleTotalValue={() => {}}
      />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesPage sales={[]} products={[]} showTotalValue={false} />
      </main>
    </div>
  );
}
