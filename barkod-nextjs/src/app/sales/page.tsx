"use client";
import SalesPage from "../../components/Pages/SalesPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";

import { Product } from "../../types";
import { useState } from "react";
import type { Tab } from "../page";
import useSWR from "swr";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Page() {
  const [search, setSearch] = useState("");
  const { data: products = [], mutate: mutateProducts } = useSWR(
    `${API_URL}/api/products`,
    fetcher
  );
  const {
    data: sales = [],
    mutate: mutateSales,
    isValidating,
  } = useSWR(
    `${API_URL}/api/sales?search=${encodeURIComponent(search)}`,
    fetcher
  );
  const [activeTab, setActiveTab] = useState<Tab>("sales");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header
        lowStockCount={products.filter((p: Product) => p.stock <= 5).length}
        activeTab={activeTab}
        onAddProduct={() => {}}
      />
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as Tab)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SalesPage
          sales={sales}
          products={products}
          onRefreshSales={async () => {
            await mutateSales();
          }}
        />
      </main>
    </div>
  );
}
