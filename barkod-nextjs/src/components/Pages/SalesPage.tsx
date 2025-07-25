"use client";
import React, { useState, useMemo } from "react";
import { Sale, Product, SaleItem } from "../../types";
import { Download, Search } from "lucide-react";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import ExcelJS from "exceljs";
import { useEffect } from "react";
import { customerService } from "../../services/customerService";
import CustomerDetailModal from "../CustomerDetailModal";
import { Customer } from "../../types";

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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Sale>>({});
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [sortBy, setSortBy] = useState<
    "date" | "amount" | "customer" | "product"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    customerService.getAll().then(setCustomers);
  }, []);

  const getCustomerName = (customerId: string | undefined) => {
    if (!customerId) return "-";
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name : customerId;
  };

  // Satış mapping fonksiyonu
  const getSaleWithProduct = (sale: Sale) => {
    // Eğer items array'i varsa (yeni format), ilk item'ı kullan
    if (sale.items && sale.items.length > 0) {
      const firstItem = sale.items[0];
      const customerName =
        getCustomerName(sale.customerId || sale.customer) || "-";
      return {
        ...sale,
        price: firstItem.price,
        productName: firstItem.productName,
        barcode: firstItem.barcode,
        customerName,
        total: firstItem.price * firstItem.quantity,
        quantity: firstItem.quantity,
      };
    }

    // Eski format için fallback
    const saleAny = sale as {
      price?: number;
      productName?: string;
      barcode?: string;
      quantity?: number;
    };
    let price = saleAny.price || 0;
    let name = saleAny.productName || "Bilinmiyor";
    let barcode = saleAny.barcode || "-";
    const quantity = saleAny.quantity || 0;

    // Ürün adı ve fiyatı yoksa ürün listesinden bul
    if (!price || !name || name === "Bilinmiyor") {
      const product = products.find((p) => p.barcode === barcode);
      price = product ? product.price : 0;
      name = product ? product.name : "Bilinmiyor";
      barcode = product ? product.barcode : barcode;
    }

    // Müşteri adı yoksa '-' yaz
    let customerName = getCustomerName(sale.customerId || sale.customer);
    if (!customerName) customerName = "-";
    const total = price * quantity;
    return {
      ...sale,
      price,
      productName: name,
      barcode,
      customerName,
      total,
      quantity,
    };
  };
  const salesWithProduct = sales
    .filter((sale) => sale.status !== "deleted")
    .map(getSaleWithProduct);

  // Filtreleme ve istatistiklerde salesWithProduct kullan
  const getFilteredSales = () => {
    let filtered = salesWithProduct.filter((sale) => sale.status !== "deleted");
    const now = new Date();
    switch (selectedPeriod) {
      case "today":
        filtered = filtered.filter(
          (sale) =>
            sale.soldAt.split("T")[0] === now.toISOString().split("T")[0]
        );
        break;
      case "week":
        const weekStart = format(new Date(), "yyyy-MM-dd");
        const weekEnd = format(new Date(), "yyyy-MM-dd");
        filtered = filtered.filter((sale) => {
          const saleDate = sale.soldAt.split("T")[0];
          return saleDate >= weekStart && saleDate <= weekEnd;
        });
        break;
      case "month":
        const monthStart = format(new Date(), "yyyy-MM-01");
        const monthEnd = format(new Date(), "yyyy-MM-31");
        filtered = filtered.filter((sale) => {
          const saleDate = sale.soldAt.split("T")[0];
          return saleDate >= monthStart && saleDate <= monthEnd;
        });
        break;
      case "custom":
        filtered = filtered.filter((sale) => {
          const saleDate = sale.soldAt.split("T")[0];
          return saleDate >= startDate && saleDate <= endDate;
        });
        break;
    }

    // Arama filtresi
    if (searchTerm) {
      filtered = filtered.filter((sale) => {
        const searchLower = searchTerm.toLowerCase();
        const productName = sale.productName?.toLowerCase() || "";
        const barcode = sale.barcode?.toLowerCase() || "";
        const customerName =
          getCustomerName(sale.customerId || sale.customer)?.toLowerCase() ||
          "";

        return (
          productName.includes(searchLower) ||
          barcode.includes(searchLower) ||
          customerName.includes(searchLower)
        );
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy) {
        case "date":
          aValue = new Date(a.soldAt).getTime();
          bValue = new Date(b.soldAt).getTime();
          break;
        case "amount":
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case "customer":
          aValue = getCustomerName(a.customerId || a.customer) || "";
          bValue = getCustomerName(b.customerId || b.customer) || "";
          break;
        case "product":
          aValue = a.productName || "";
          bValue = b.productName || "";
          break;
        default:
          aValue = new Date(a.soldAt).getTime();
          bValue = new Date(b.soldAt).getTime();
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  const filteredSales = getFilteredSales();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const formatDateTime = (dateStr: string) => {
    return format(parseISO(dateStr), "dd MMM yyyy HH:mm", {
      locale: tr,
    });
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Satışlar");

    // Başlıkları ekle
    worksheet.columns = [
      { header: "Ürün", key: "product", width: 30 },
      { header: "Barkod", key: "barcode", width: 15 },
      { header: "Müşteri", key: "customer", width: 20 },
      { header: "Adet", key: "quantity", width: 10 },
      { header: "Fiyat", key: "price", width: 15 },
      { header: "Toplam", key: "total", width: 15 },
      { header: "Tarih", key: "date", width: 20 },
    ];

    // Verileri ekle
    filteredSales.forEach((sale) => {
      if (Array.isArray(sale.items) && sale.items.length > 0) {
        sale.items.forEach((item: SaleItem) => {
          worksheet.addRow({
            product: item.productName || "-",
            barcode: item.barcode || "-",
            customer: getCustomerName(sale.customerId || sale.customer) || "-",
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            date: formatDateTime(sale.soldAt),
          });
        });
      } else {
        worksheet.addRow({
          product: sale.productName || "-",
          barcode: sale.barcode || "-",
          customer: getCustomerName(sale.customerId || sale.customer) || "-",
          quantity: sale.quantity,
          price: sale.price,
          total: sale.total,
          date: formatDateTime(sale.soldAt),
        });
      }
    });

    // Excel dosyasını indir
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satışlar_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteSale = async (id: string) => {
    if (confirm("Bu satışı silmek istediğinizden emin misiniz?")) {
      try {
        console.log("Silme işlemi başladı, id:", id);
        const response = await fetch(`/api/sales?id=${id}`, {
          method: "DELETE",
        });
        const result = await response.json();
        console.log("Silme response:", result);
        if (response.ok) {
          if (onRefreshSales) {
            onRefreshSales();
          } else {
            window.location.reload();
          }
        } else {
          alert(result.error || "Silme başarısız");
        }
      } catch (error) {
        console.error("Satış silme hatası:", error);
      }
    }
  };

  const handleEditClick = (sale: Sale) => {
    setEditingSale(sale);
    setEditForm(sale);
    setShowEditModal(true);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleEditSave = async () => {
    if (!editingSale) return;
    try {
      await fetch(`/api/sales/${editingSale._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setShowEditModal(false);
      if (onRefreshSales) onRefreshSales();
    } catch (error) {
      console.error("Satış güncelleme hatası:", error);
    }
  };

  const handleCustomerClick = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      setShowCustomerModal(true);
    }
  };

  // Pagination için
  const itemsPerPage = 20;
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = useMemo(
    () =>
      filteredSales.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      ),
    [filteredSales, currentPage, itemsPerPage]
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
      {/* ÜSTTE ARAMA VE FİLTRELER */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-[5px] mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Ürün, barkod veya müşteri adı ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-2 py-[5px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) =>
            setSelectedPeriod(
              e.target.value as "all" | "today" | "week" | "month" | "custom"
            )
          }
          className="px-[5px] py-[5px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[120px]"
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
              className="px-[5px] py-[5px] border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <span className="text-gray-500 dark:text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-[5px] py-[5px] border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </>
        )}
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split("-");
            setSortBy(field as "date" | "amount" | "customer" | "product");
            setSortOrder(order as "asc" | "desc");
          }}
          className="px-[5px] py-[5px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-w-[140px]"
        >
          <option value="date-desc">Tarih (Yeni {">"} Eski)</option>
          <option value="date-asc">Tarih (Eski {">"} Yeni)</option>
          <option value="amount-desc">Tutar (Yüksek {">"} Düşük)</option>
          <option value="amount-asc">Tutar (Düşük {">"} Yüksek)</option>
          <option value="customer-asc">Müşteri A-Z</option>
          <option value="customer-desc">Müşteri Z-A</option>
          <option value="product-asc">Ürün A-Z</option>
          <option value="product-desc">Ürün Z-A</option>
        </select>
        <button
          onClick={() => {
            setSearchTerm("");
            setSelectedPeriod("all");
            setStartDate(new Date().toISOString().split("T")[0]);
            setEndDate(new Date().toISOString().split("T")[0]);
            setSortBy("date");
            setSortOrder("desc");
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
        >
          Filtreleri Temizle
        </button>
        <button
          onClick={exportToExcel}
          className="bg-success-600 hover:bg-success-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 font-medium"
        >
          <Download className="w-4 h-4" />
          Excel İndir
        </button>
      </div>

      {/* YATAY SATIŞ TABLOSU */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-[5px] w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Barkod
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Adet
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Birim Fiyat
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Toplam
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ödeme
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedSales.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    Satış bulunamadı
                  </td>
                </tr>
              ) : (
                paginatedSales.flatMap((sale) => {
                  if (Array.isArray(sale.items) && sale.items.length > 0) {
                    return sale.items.map((item: SaleItem, idx: number) => (
                      <tr
                        key={`${sale._id}-${idx}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-3 py-2 text-sm text-gray-900 dark:text-white font-semibold">
                          {item.productName || "-"}
                        </td>
                        <td className="px-3 py-2 text-sm text-primary-700 dark:text-primary-300 font-mono">
                          {item.barcode || "-"}
                        </td>
                        <td
                          className="px-3 py-2 text-sm text-primary-600 underline cursor-pointer font-semibold"
                          onClick={
                            sale.customerId || sale.customer
                              ? () =>
                                  handleCustomerClick(
                                    sale.customerId || sale.customer || ""
                                  )
                              : undefined
                          }
                        >
                          {getCustomerName(sale.customerId || sale.customer)}
                        </td>
                        <td className="px-3 py-2 text-sm text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {item.quantity} adet
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-mono">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {formatPrice(item.price)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-mono font-semibold">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            {sale.paymentType || "nakit"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {formatDateTime(sale.soldAt)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(sale)}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale._id)}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  } else {
                    return (
                      <tr
                        key={sale._id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td className="px-1 py-1 text-xs text-gray-900 dark:text-white font-semibold">
                          {sale.productName || "-"}
                        </td>
                        <td className="px-1 py-1 text-xs text-primary-700 dark:text-primary-300 font-mono">
                          {sale.barcode || "-"}
                        </td>
                        <td
                          className="px-1 py-1 text-xs text-primary-600 underline cursor-pointer font-semibold"
                          onClick={
                            sale.customerId || sale.customer
                              ? () =>
                                  handleCustomerClick(
                                    sale.customerId || sale.customer || ""
                                  )
                              : undefined
                          }
                        >
                          {getCustomerName(sale.customerId || sale.customer)}
                        </td>
                        <td className="px-1 py-1 text-xs text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {(sale as { quantity?: number }).quantity || 0} adet
                          </span>
                        </td>
                        <td className="px-1 py-1 text-xs text-right font-mono">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {formatPrice(sale.price || 0)}
                          </span>
                        </td>
                        <td className="px-1 py-1 text-xs text-right font-mono font-semibold">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {formatPrice(sale.total || 0)}
                          </span>
                        </td>
                        <td className="px-1 py-1 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            {sale.paymentType || "nakit"}
                          </span>
                        </td>
                        <td className="px-1 py-1 text-xs">
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            {formatDateTime(sale.soldAt)}
                          </span>
                        </td>
                        <td className="px-1 py-1 text-xs text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEditClick(sale)}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteSale(sale._id)}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Önceki
          </button>
          <span className="text-gray-700 dark:text-gray-300">
            Sayfa {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Müşteri Detay Modal */}
      {showCustomerModal && selectedCustomer && (
        <CustomerDetailModal
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          customer={selectedCustomer}
        />
      )}

      {/* Düzenleme Modal */}
      {showEditModal && editingSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Satış Düzenle
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adet
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={(editForm as { quantity?: number }).quantity || ""}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fiyat
                </label>
                <input
                  type="number"
                  name="price"
                  value={(editForm as { price?: number }).price || ""}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleEditSave}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
