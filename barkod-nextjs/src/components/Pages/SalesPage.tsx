"use client";
import React, { useState } from "react";
import { Sale, Product } from "../../types";
import { BarChart3, Package, AlertTriangle, Download } from "lucide-react";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import ExcelJS from "exceljs";

interface SalesPageProps {
  sales: Sale[];
  products: Product[];
  showTotalValue: boolean;
}

const SalesPage: React.FC<SalesPageProps> = ({
  sales,
  products,
  showTotalValue,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month" | "custom"
  >("today");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSaleProduct, setSelectedSaleProduct] = useState<string | null>(
    null
  );
  const [showSaleModal, setShowSaleModal] = useState(false);

  // Satışa ürün adı ve fiyatı ekle
  const getSaleWithProduct = (sale: Sale) => {
    let price = sale.price;
    let name = sale.productName;
    if (price == null || name == null || name === "Bilinmiyor") {
      const product = products.find((p) => p.barcode === sale.barcode);
      price = product ? product.price : 0;
      name = product ? product.name : "Bilinmiyor";
    }
    const total = price * sale.quantity;
    return { ...sale, price, productName: name, total };
  };
  const salesWithProduct = sales.map(getSaleWithProduct);

  // Filtreleme ve istatistiklerde salesWithProduct kullan
  const getFilteredSales = () => {
    let filtered = salesWithProduct;
    const now = new Date();
    switch (selectedPeriod) {
      case "today":
        filtered = salesWithProduct.filter(
          (sale) =>
            sale.soldAt.split("T")[0] === now.toISOString().split("T")[0]
        );
        break;
      case "week":
        const weekStart = format(new Date(), "yyyy-MM-dd");
        const weekEnd = format(new Date(), "yyyy-MM-dd");
        filtered = salesWithProduct.filter((sale) => {
          const saleDate = sale.soldAt.split("T")[0];
          return saleDate >= weekStart && saleDate <= weekEnd;
        });
        break;
      case "month":
        const monthStart = format(new Date(), "yyyy-MM-01");
        const monthEnd = format(new Date(), "yyyy-MM-31");
        filtered = salesWithProduct.filter((sale) => {
          const saleDate = sale.soldAt.split("T")[0];
          return saleDate >= monthStart && saleDate <= monthEnd;
        });
        break;
      case "custom":
        filtered = salesWithProduct.filter((sale) => {
          const saleDate = sale.soldAt.split("T")[0];
          return saleDate >= startDate && saleDate <= endDate;
        });
        break;
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (sale) =>
          (sale.productName ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          sale.barcode.includes(searchTerm)
      );
    }
    return filtered.sort(
      (a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime()
    );
  };
  const filteredSales = getFilteredSales();

  // Aynı ürünleri grupla
  const groupedSales = filteredSales.reduce((acc, sale) => {
    if (!acc[sale.barcode]) acc[sale.barcode] = [];
    acc[sale.barcode].push(sale);
    return acc;
  }, {} as Record<string, typeof filteredSales>);
  const groupedSalesArr = Object.values(groupedSales);

  const stats = {
    totalSales: filteredSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0),
    totalItems: filteredSales.reduce((sum, sale) => sum + sale.quantity, 0),
    transactions: filteredSales.length,
    avgTransaction:
      filteredSales.length > 0
        ? filteredSales.reduce((sum, sale) => sum + (sale.total ?? 0), 0) /
          filteredSales.length
        : 0,
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), "HH:mm", { locale: tr });
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd MMM yyyy", { locale: tr });
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Satışlar");
    worksheet.addRow([
      "Tarih",
      "Saat",
      "Ürün",
      "Barkod",
      "Miktar",
      "Birim Fiyat",
      "Toplam",
    ]);
    filteredSales.forEach((sale) => {
      worksheet.addRow([
        formatDate(sale.soldAt),
        formatTime(sale.soldAt),
        sale.productName,
        sale.barcode,
        sale.quantity,
        sale.price,
        sale.total,
      ]);
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `satislar_${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Günlük satış grafiği için veri hazırlama
  const getDailySalesData = () => {
    const dailyData: { [key: string]: number } = {};
    filteredSales.forEach((sale) => {
      const date = sale.soldAt.split("T")[0];
      dailyData[date] = (dailyData[date] || 0) + sale.total;
    });
    return Object.entries(dailyData).sort(([a], [b]) => a.localeCompare(b));
  };

  const dailySalesData = getDailySalesData();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      {/* İstatistik kutuları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Satış
              </p>
              {showTotalValue ? (
                <p className="text-2xl font-bold text-success-600">
                  {formatPrice(stats.totalSales)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-success-600 select-none tracking-widest">
                  ***
                </p>
              )}
            </div>
            <BarChart3 className="w-8 h-8 text-success-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Satılan Ürün
              </p>
              <p className="text-2xl font-bold text-primary-600">
                {stats.totalItems}
              </p>
            </div>
            <Package className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                İşlem Sayısı
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {stats.transactions}
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ortalama İşlem Tutarı
              </p>
              {showTotalValue ? (
                <p className="text-2xl font-bold text-orange-600">
                  {formatPrice(stats.avgTransaction)}
                </p>
              ) : (
                <p className="text-2xl font-bold text-orange-600 select-none tracking-widest">
                  ***
                </p>
              )}
            </div>
            <BarChart3 className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Ortalama İşlem Tutarı
          </p>
        </div>
      </div>
      {/* Filtre/search barlar ve satış geçmişi */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex gap-2">
            {[
              { value: "today", label: "Bugün" },
              { value: "week", label: "Bu Hafta" },
              { value: "month", label: "Bu Ay" },
              { value: "custom", label: "Özel" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() =>
                  setSelectedPeriod(
                    period.value as "today" | "week" | "month" | "custom"
                  )
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period.value
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>

          {selectedPeriod === "custom" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500 dark:text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}

          <div className="flex-1">
            <input
              type="text"
              placeholder="Ürün veya barkod ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <button
            onClick={exportToExcel}
            className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Download className="w-4 h-4" />
            Excel İndir
          </button>
        </div>
      </div>

      {/* Daily Sales Chart */}
      {dailySalesData.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Günlük Satış Grafiği
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {dailySalesData.map(([date, amount]) => {
              const maxAmount = Math.max(
                ...dailySalesData.map(([, amt]) => amt)
              );
              const height = (amount / maxAmount) * 100;
              return (
                <div key={date} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-primary-600 rounded-t transition-all duration-300 hover:bg-primary-700 min-h-[4px]"
                    style={{ height: `${height}%` }}
                    title={`${formatDate(date)}: ${formatPrice(amount)}`}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 transform -rotate-45 origin-left">
                    {format(parseISO(date), "dd/MM", { locale: tr })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Satış Geçmişi ({filteredSales.length})
          </h2>
        </div>

        {groupedSalesArr.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Satış bulunamadı
            </p>
            <p className="text-gray-400 text-sm">
              Satış yapmak için ürün seçin veya barkod okutun.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {groupedSalesArr.map((salesGroup) => {
              const first = salesGroup[0];
              const totalQty = salesGroup.reduce(
                (sum, s) => sum + s.quantity,
                0
              );
              const price = first.price;
              return (
                <div key={first.barcode}>
                  <div
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors cursor-pointer shadow-sm"
                    onClick={() => {
                      setSelectedSaleProduct(first.barcode);
                      setShowSaleModal(true);
                    }}
                  >
                    <div>
                      <div className="font-semibold text-base text-gray-900 dark:text-white tracking-tight">
                        {first.productName}
                      </div>
                      <div className="text-xs text-primary-700 dark:text-primary-300 font-mono tracking-wider">
                        {first.barcode}
                      </div>
                    </div>
                    {showTotalValue ? (
                      <div className="text-right font-bold text-lg text-primary-600 dark:text-primary-400">
                        {totalQty} x {formatPrice(price)} ={" "}
                        {formatPrice(totalQty * price)}
                      </div>
                    ) : (
                      <div className="text-right font-bold text-lg text-primary-600 dark:text-primary-400 select-none tracking-widest">
                        ***
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Satış Detay Modalı */}
      {showSaleModal && selectedSaleProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowSaleModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Satış Detayları
            </h2>
            <div className="space-y-2">
              {groupedSales[selectedSaleProduct].map((sale, idx) => (
                <div
                  key={sale.id + idx}
                  className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-2"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {sale.productName}
                    </div>
                    <div className="text-xs text-primary-700 dark:text-primary-300 font-mono">
                      {sale.barcode}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {showTotalValue
                        ? `${sale.quantity} x ${formatPrice(sale.price)}`
                        : "***"}
                    </span>{" "}
                    ={" "}
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {showTotalValue ? formatPrice(sale.total) : "***"}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(sale.soldAt)} {formatTime(sale.soldAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
