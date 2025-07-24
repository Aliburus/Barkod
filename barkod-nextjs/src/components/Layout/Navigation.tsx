"use client";
import React from "react";
import { Scan, Package, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Tab = "scanner" | "products" | "sales" | "analytics";

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const pathname = usePathname();
  const router = useRouter();
  const tabs = [
    {
      id: "scanner" as Tab,
      label: "Barkod Tara",
      icon: Scan,
      color: "text-blue-600",
    },
    {
      id: "products" as Tab,
      label: "Ürünler",
      icon: Package,
      color: "text-green-600",
    },
    {
      id: "sales" as Tab,
      label: "Satışlar",
      icon: TrendingUp,
      color: "text-purple-600",
    },
    {
      id: "analytics" as Tab,
      label: "Analitik",
      icon: BarChart3,
      color: "text-orange-600",
    },
  ];

  const tabRoutes: Record<string, string> = {
    scanner: "/",
    products: "/", // ana sayfa ürünler
    sales: "/sales",
    analytics: "/analytics",
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  router.push(tabRoutes[tab.id]);
                  onTabChange(tab.id);
                }}
                className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ""}`} />
                {tab.label}
              </button>
            );
          })}
          {/* Yeni eklenen menü butonları */}
          <Link
            href="/customers"
            className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
              pathname === "/customers"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            Müşteriler
          </Link>
          <Link
            href="/account-transactions"
            className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap ${
              pathname === "/account-transactions"
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            Cari Hareketler
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
