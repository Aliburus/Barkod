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
  Wallet,
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
      route: "/products",
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
    {
      id: "kasa" as Tab,
      label: "Kasa",
      icon: Wallet,
      color: "text-yellow-600",
      route: "/kasa",
    },
  ];

  const tabRoutes: Record<string, string> = {
    scanner: "/",
    products: "/", // ana sayfa ürünler
    sales: "/sales",
    analytics: "/analytics",
  };

  return (
    <nav className="bg-gray-900 dark:bg-gray-900 shadow-sm border-b border-gray-800 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-0 sm:px-4 lg:px-8">
        <div
          className="relative flex items-center py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100 gap-0 sm:gap-8"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="flex-1 flex gap-0 sm:gap-8 min-w-0 overflow-x-auto">
            {/* Diğer tablar */}
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    router.push(tab.route);
                    onTabChange(tab.id);
                  }}
                  className={`flex flex-col items-center gap-1 px-4 py-2 text-xs font-semibold border-b-[3px] transition-all duration-200 whitespace-nowrap rounded-none bg-transparent focus:outline-none focus:ring-0 ${
                    isActive
                      ? `border-primary-500 text-white ${tab.color}`
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                  }`}
                  style={{ minWidth: 80 }}
                >
                  <Icon
                    className={`w-5 h-5 mb-0.5 ${
                      isActive ? tab.color : "text-gray-400"
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
