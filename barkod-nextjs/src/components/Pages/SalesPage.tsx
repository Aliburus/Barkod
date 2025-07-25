"use client";
import React, { useState, useMemo } from "react";
import { Sale, Product } from "../../types";
import { Download, Trash2 } from "lucide-react";
import { parseISO, format } from "date-fns";
import ExcelJS from "exceljs";
import { productService } from "../../services/productService";
import { useEffect } from "react";
import { customerService } from "../../services/customerService";
import { salesService } from "../../services/productService";

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
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>(
    []
  );
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Sale>>({});

  useEffect(() => {
    customerService.getAll().then(setCustomers);
  }, []);

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
    return format(parseISO(dateStr), "dd MMMM yyyy HH.mm");
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
        format(parseISO(sale.soldAt), "dd MMM yyyy"),
        format(parseISO(sale.soldAt), "HH.mm"),
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

  const handleEditClick = (sale: Sale) => {
    setEditingSale(sale);
    setEditForm({ ...sale });
    setShowEditModal(true);
  };
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };
  const handleEditSave = async () => {
    if (!editingSale) return;
    await salesService.update(editingSale.id, editForm);
    setShowEditModal(false);
    setEditingSale(null);
    if (onRefreshSales) onRefreshSales();
  };

  useEffect(() => {
    // Satışları güncellemek için parenttan props ile geliyorsa parentı tetikle, yoksa burada fetch et
    // Burada sadece refresh için dummy state kullanıldı
  }, []);

  const getCustomerName = (customerId: string | undefined) => {
    if (!customerId) return "-";
    const found = customers.find((c) => c.id === customerId);
    return found ? found.name : customerId;
  };

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
    totalPages > 1 ? (
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
    ) : null;
  }

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
      {/* Üstte arama ve filtreler */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-4 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Ürün, barkod veya müşteri ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        />
        <select
          value={selectedPeriod}
          onChange={(e) =>
            setSelectedPeriod(
              e.target.value as "all" | "today" | "week" | "month" | "custom"
            )
          }
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">Tümü</option>
          <option value="today">Bugün</option>
          <option value="week">Bu Hafta</option>
          <option value="month">Bu Ay</option>
          <option value="custom">Özel</option>
        </select>
        {selectedPeriod === "custom" && (
          <>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <span className="text-gray-500 dark:text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </>
        )}
        <button
          onClick={exportToExcel}
          className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Download className="w-4 h-4" />
          Excel İndir
        </button>
      </div>
      {/* Altta yatay satış tablosu */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Ürün
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Barkod
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Müşteri
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Adet
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Fiyat
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Toplam
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tarih
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    Satış yok
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale, index) => (
                  <tr
                    key={sale.id || sale.barcode + "-" + index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-semibold">
                      {sale.productName}
                    </td>
                    <td className="px-4 py-2 text-sm text-primary-700 dark:text-primary-300 font-mono">
                      {sale.barcode}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                      {getCustomerName(sale.customer)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                      {sale.quantity}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                      {formatPrice(sale.price)}
                    </td>
                    <td className="px-4 py-2 text-sm text-success-700 dark:text-success-400 font-bold">
                      {formatPrice(sale.total)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                      {formatDateTime(sale.soldAt)}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleEditClick(sale)}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1 mr-2"
                        title="Düzenle"
                      >
                        Düzenle
                      </button>
                      <button
                        onClick={() => handleDeleteSaleGroup(sale.barcode)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                        title="Sil"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
                  key={sale.id ? sale.id : sale.soldAt + "-" + idx}
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
      {showEditModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg p-3 sm:p-6 relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Satış Düzenle
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEditSave();
              }}
              className="space-y-3"
            >
              <input
                name="productName"
                value={editForm.productName || ""}
                onChange={handleEditChange}
                placeholder="Ürün Adı"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                name="barcode"
                value={editForm.barcode || ""}
                onChange={handleEditChange}
                placeholder="Barkod"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                name="quantity"
                type="number"
                value={editForm.quantity || 1}
                onChange={handleEditChange}
                placeholder="Adet"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                name="price"
                type="number"
                value={editForm.price || 0}
                onChange={handleEditChange}
                placeholder="Fiyat"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                name="soldAt"
                type="datetime-local"
                value={editForm.soldAt ? editForm.soldAt.slice(0, 16) : ""}
                onChange={handleEditChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
              >
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
SalesPage.displayName = "SalesPage";

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
SaleGroupCard.displayName = "SaleGroupCard";

export default SalesPage;
