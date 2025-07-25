"use client";
import React, { useState, useMemo } from "react";
import { Sale, Product } from "../../types";
import {
  BarChart3,
  Package,
  AlertTriangle,
  Download,
  Trash2,
} from "lucide-react";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import ExcelJS from "exceljs";
import { productService } from "../../services/productService";
import { useEffect } from "react";

interface SalesPageProps {
  sales: Sale[];
  products: Product[];
  onRefreshSales?: () => void;
}

const SalesPage: React.FC<SalesPageProps> = ({
  sales,
  products,
  onRefreshSales,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<
    "all" | "today" | "week" | "month" | "custom"
  >("all");
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
  const salesWithProduct = sales
    .filter((sale) => sale.status !== "deleted")
    .map(getSaleWithProduct);

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
      case "all":
      default:
        // Tüm satışlar
        filtered = salesWithProduct;
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
  const groupedSalesArr = useMemo(
    () => Object.values(groupedSales),
    [groupedSales]
  );

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

  const formatDateTime = (dateStr: string) => {
    return format(parseISO(dateStr), "dd MMMM yyyy HH.mm", { locale: tr });
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
        format(parseISO(sale.soldAt), "dd MMM yyyy", { locale: tr }),
        format(parseISO(sale.soldAt), "HH.mm", { locale: tr }),
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

  const handleDeleteSaleGroup = async (barcode: string) => {
    await productService.deleteSalesByBarcode(barcode);
    if (onRefreshSales) onRefreshSales();
  };

  useEffect(() => {
    // Satışları güncellemek için parenttan props ile geliyorsa parentı tetikle, yoksa burada fetch et
    // Burada sadece refresh için dummy state kullanıldı
  }, []);

  // Pagination için
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const [currentPage, setCurrentPage] = useState(1);
  const paginatedSales = useMemo(
    () =>
      filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredSales, currentPage, itemsPerPage]
  );
  // Pagination butonları sadece totalPages > 1 ise göster
  {
    totalPages > 1 && (
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded"
        >
          Önceki
        </button>
        <span>Sayfa {currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded"
        >
          Sonraki
        </button>
      </div>
    );
  }

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
              <p className="text-2xl font-bold text-success-600">
                {formatPrice(stats.totalSales)}
              </p>
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
              <p className="text-2xl font-bold text-orange-600">
                {formatPrice(stats.avgTransaction)}
              </p>
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
              { value: "all", label: "Tümü" },
              { value: "today", label: "Bugün" },
              { value: "week", label: "Bu Hafta" },
              { value: "month", label: "Bu Ay" },
              { value: "custom", label: "Özel" },
            ].map((period) => (
              <button
                key={period.value}
                onClick={() =>
                  setSelectedPeriod(
                    period.value as
                      | "all"
                      | "today"
                      | "week"
                      | "month"
                      | "custom"
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
                    title={`${format(parseISO(date), "dd/MM", {
                      locale: tr,
                    })}: ${formatPrice(amount)}`}
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
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Satış Geçmişi ({filteredSales.length})
        </h2>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {/* isValidating is not directly available from the original code,
              but it's implied by the new_code. Assuming it's a placeholder
              for a loading state or similar. For now, we'll just render
              the skeleton if groupedSalesArr is empty, as there's no
              explicit loading state for the sales list itself. */}
          {paginatedSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2a4 4 0 018 0v2M9 17H7a2 2 0 01-2-2v-5a2 2 0 012-2h10a2 2 0 012 2v5a2 2 0 01-2 2h-2M9 17v2a2 2 0 002 2h2a2 2 0 002-2v-2"
                />
              </svg>
              <span>Hiç satış yok</span>
            </div>
          ) : (
            <ul className="space-y-3">
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
                groupedSalesArr.map((salesGroup) => {
                  const first = salesGroup[0];
                  const totalQty = salesGroup.reduce(
                    (sum, s) => sum + s.quantity,
                    0
                  );
                  const price = first.price;
                  return (
                    <SaleGroupCard
                      key={first.barcode}
                      first={first}
                      totalQty={totalQty}
                      price={price}
                      onDelete={handleDeleteSaleGroup}
                      formatPrice={formatPrice}
                      onClick={() => {
                        setSelectedSaleProduct(first.barcode);
                        setShowSaleModal(true);
                      }}
                    />
                  );
                })
              )}
            </ul>
          )}
        </div>
      </div>
      {/* Satış Detay Modalı */}
      {showSaleModal && selectedSaleProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg p-3 sm:p-6 relative">
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
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 dark:border-gray-700 py-2 gap-2"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {sale.productName}
                    </div>
                    <div className="text-xs text-primary-700 dark:text-primary-300 font-mono">
                      {sale.barcode}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <b>Müşteri:</b> {sale.customer || "-"}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <b>Ödeme Tipi:</b> {sale.paymentType || "-"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {sale.quantity} x {formatPrice(sale.price)}
                    </span>{" "}
                    ={" "}
                    <span className="font-semibold text-primary-600 dark:text-primary-400">
                      {formatPrice(sale.total)}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <b>Tarih:</b> {formatDateTime(sale.soldAt)}
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

const SaleGroupCard = React.memo(
  ({
    first,
    totalQty,
    price,
    onDelete,
    formatPrice,
    onClick,
  }: {
    first: Sale;
    totalQty: number;
    price: number;
    onDelete: (barcode: string) => void;
    formatPrice: (n: number) => string;
    onClick: () => void;
  }) => (
    <li
      key={first.barcode}
      className="flex items-center justify-between bg-white/90 dark:bg-gray-800/90 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-4 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <span className="font-bold text-lg sm:text-xl text-gray-900 dark:text-white truncate">
          {first.productName}
        </span>
        <span className="text-xs text-primary-700 dark:text-primary-300 font-mono tracking-wider truncate">
          {first.barcode}
        </span>
      </div>
      <div className="flex flex-col items-end min-w-[180px]">
        <span className="font-bold text-lg sm:text-xl text-primary-600 dark:text-primary-400">
          {formatPrice(totalQty * price)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {totalQty} x {formatPrice(price)}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(first.barcode);
        }}
        className="ml-4 flex items-center justify-center text-red-600 hover:text-red-800 transition-colors opacity-80 group-hover:opacity-100"
        title="Sil"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </li>
  )
);

export default SalesPage;
