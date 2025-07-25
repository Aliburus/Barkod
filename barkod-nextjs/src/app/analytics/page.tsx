"use client";
import React, { useState } from "react";
import AnalyticsPage from "../../components/Pages/AnalyticsPage";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import type { Tab } from "../page";

import { Product, Payment, Customer } from "../../types";
import useSWR from "swr";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const fetcher = (url: string) =>
  fetch(`${API_URL}${url}`).then((res) => res.json());

export default function Page() {
  const [search, setSearch] = useState("");
  const { data: products = [], mutate: mutateProducts } = useSWR(
    `${API_URL}/api/products?search=${encodeURIComponent(search)}`,
    fetcher,
    { fallbackData: [] }
  );
  const {
    data: sales = [],
    mutate: mutateSales,
    isValidating,
  } = useSWR(
    `${API_URL}/api/sales?search=${encodeURIComponent(search)}`,
    fetcher,
    { fallbackData: [] }
  );
  const { data: payments = [] } = useSWR(`${API_URL}/api/payments`, fetcher, {
    fallbackData: [],
  });
  const { data: customers = [] } = useSWR(`${API_URL}/api/customers`, fetcher, {
    fallbackData: [],
  });
  const { data: expenses = [] } = useSWR(`${API_URL}/api/giderler`, fetcher, {
    fallbackData: [],
  });
  const { data: kasaRows = [] } = useSWR(`${API_URL}/api/kasa`, fetcher, {
    fallbackData: [],
  });
  const [activeTab, setActiveTab] = useState<Tab>("analytics");

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
        <AnalyticsPage
          products={products}
          sales={sales}
          payments={payments}
          customers={customers}
          expenses={expenses}
          kasaRows={kasaRows}
        />
      </main>
    </div>
  );
}
