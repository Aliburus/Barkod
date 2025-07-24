import React from "react";
import {
  BarChart3,
  AlertTriangle,
  Plus,
  Sun,
  Moon,
  Eye,
  EyeOff,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

interface HeaderProps {
  lowStockCount: number;
  activeTab: string;
  onAddProduct: () => void;
  showTotalValue: boolean;
  onToggleTotalValue: () => void;
}

const Header: React.FC<HeaderProps> = ({
  lowStockCount,
  activeTab,
  onAddProduct,
  showTotalValue,
  onToggleTotalValue,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                StokTak Pro
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Barkod & Stok Yönetimi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 bg-warning-50 dark:bg-warning-900/20 px-3 py-2 rounded-md border border-warning-200 dark:border-warning-800">
                <AlertTriangle className="w-4 h-4 text-warning-600 dark:text-warning-400" />
                <span className="text-sm text-warning-800 dark:text-warning-300">
                  {lowStockCount} ürün kritik stokta
                </span>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={
                theme === "light" ? "Karanlık moda geç" : "Aydınlık moda geç"
              }
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            <button
              onClick={onToggleTotalValue}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={showTotalValue ? "Değerleri Gizle" : "Değerleri Göster"}
            >
              {showTotalValue ? (
                <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {activeTab === "products" && (
              <button
                onClick={onAddProduct}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-4 h-4" />
                Ürün Ekle
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
