"use client";
import React, { useState } from "react";
import CustomersPage from "../../components/Pages/CustomersPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import type { Tab } from "../page";

export default function Page() {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        lowStockCount={0}
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
        <CustomersPage />
      </main>
    </div>
  );
}
