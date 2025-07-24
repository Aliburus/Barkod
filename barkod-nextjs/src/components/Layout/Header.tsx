"use client";
import React, { useState } from "react";
import { BarChart3, AlertTriangle, Plus, Eye, EyeOff } from "lucide-react";

interface HeaderProps {
  lowStockCount: number;
  activeTab: string;
  onAddProduct: () => void;
  showTotalValue: boolean;
  onToggleTotalValue: () => void;
  onBulkUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Header: React.FC<HeaderProps> = ({
  lowStockCount,
  activeTab,
  onAddProduct,
  showTotalValue,
  onToggleTotalValue,
  onBulkUpload,
}) => {
  const [showBulkModal, setShowBulkModal] = useState(false);

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
            {/* Dark-light mode butonu ve kodları kaldırıldı */}
            <button
              onClick={onToggleTotalValue}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title={showTotalValue ? "Değerleri Gizle" : "Değerleri Göster"}
            >
              {showTotalValue ? (
                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
            {activeTab === "products" && (
              <>
                <button
                  onClick={onAddProduct}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Ürün Ekle
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium cursor-pointer ml-2"
                >
                  Toplu Ürün Ekle
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Toplu Ürün Ekle Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Toplu Ürün Ekle
            </h2>
            <div className="mb-4 text-gray-700 dark:text-gray-200 text-sm space-y-1">
              <div>Excel dosyanızda şu başlıklar olmalı:</div>
              <ul className="list-disc pl-5">
                <li>
                  <b>Barkod</b> (zorunlu)
                </li>
                <li>
                  <b>İsim</b> (zorunlu)
                </li>
                <li>Fiyat</li>
                <li>Stok</li>
                <li>Kategori</li>
                <li>Marka</li>
              </ul>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                İlk satır başlık olmalı, ardından ürünler gelmeli.
              </div>
            </div>
            <label className="block w-full">
              <span className="block mb-2 font-medium">Excel Dosyası Seç</span>
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  onBulkUpload && onBulkUpload(e);
                  setShowBulkModal(false);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </label>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
