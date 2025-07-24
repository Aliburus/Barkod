"use client";
import React from "react";
import {
  Scan,
  Package,
  TrendingUp,
  BarChart3,
  User,
  Loader2,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Tab } from "../../app/page";

interface NavigationProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const tabs = [
    {
      id: "scanner" as Tab,
      label: "Barkod Tara",
      icon: Scan,
      color: "text-blue-600",
      route: "/",
    },
    {
      id: "products" as Tab,
      label: "Ürünler",
      icon: Package,
      color: "text-green-600",
      route: "/",
    },
    {
      id: "sales" as Tab,
      label: "Satışlar",
      icon: TrendingUp,
      color: "text-purple-600",
      route: "/sales",
    },
    {
      id: "customers" as Tab,
      label: "Müşteriler",
      icon: User,
      color: "text-yellow-600",
      route: "/customers",
    },
    {
      id: "payments" as Tab,
      label: "Ödemeler",
      icon: CreditCard,
      color: "text-pink-600",
      route: "/payments",
    },
    {
      id: "analytics" as Tab,
      label: "Analitik",
      icon: BarChart3,
      color: "text-orange-600",
      route: "/analytics",
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
        <div className="relative flex space-x-8 overflow-x-auto items-center">
          {loading && (
            <div className="absolute left-1/2 -translate-x-1/2 z-10">
              <Loader2 className="animate-spin w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive =
              activeTab === tab.id ||
              (tab.id === "customers" && pathname === "/customers");
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setLoading(true);
                  router.push(tab.route);
                  onTabChange(tab.id);
                  setTimeout(() => setLoading(false), 500);
                }}
                className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-[3px] transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? "border-primary-600 dark:border-primary-400 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                disabled={loading}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
