"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Sale, Product, SaleItem } from "../../types";
import {
  Download,
  Search,
  Edit3,
  Receipt,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import ExcelJS from "exceljs";
import { customerService } from "../../services/customerService";
import CustomerDetailModal from "../CustomerDetailModal";
import { Customer } from "../../types";

// Custom hook for infinite scroll
const useInfiniteSales = (filters: {
  search: string;
  period: string;
  startDate: string;
  endDate: string;
}) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);

  // Debounce için timeout ref'i
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  // İlk yükleme - debounce ile
  useEffect(() => {
    // Önceki timeout'u temizle
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const fetchSales = async () => {
      setLoading(true);
      setSkip(0);
      setHasMore(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.append("search", filters.search);
        if (filters.period) params.append("period", filters.period);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        params.append("skip", "0");

        const response = await fetch(`/api/sales?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setSales(data.sales || data);
          setHasMore(data.hasMore || false);
          setSkip(data.nextSkip || 50);
        }
      } catch (error) {
        console.error("Satışlar yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    // 300ms debounce
    timeoutRef.current = setTimeout(fetchSales, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [filters]);

  // Daha fazla satış yükleme fonksiyonu
  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.period) params.append("period", filters.period);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      params.append("skip", skip.toString());

      const response = await fetch(`/api/sales?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSales((prev) => [...prev, ...(data.sales || data)]);
        setHasMore(data.hasMore || false);
        setSkip(data.nextSkip || skip + 50);
      }
    } catch (error) {
      console.error("Daha fazla satış yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  return { sales, loading, hasMore, loadMore };
};

interface SalesPageProps {
  sales?: Sale[];
  isLoading?: boolean;
  onRefreshSales?: () => void;
}

// Düzenlenebilir fiyat bileşeni
const EditablePrice: React.FC<{
  value: number;
  onSave: (newPrice: number) => void;
}> = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onSave(newPrice);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value.toString());
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        className="w-20 px-2 py-1 text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        autoFocus
      />
    );
  }

  return (
    <div className="flex items-center justify-end gap-1 group">
      <span className="font-medium">₺{value.toLocaleString()}</span>
      <button
        onClick={() => {
          setIsEditing(true);
          setEditValue(value.toString());
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    </div>
  );
};

const SalesPage: React.FC<SalesPageProps> = ({
  sales: initialSales,
  isLoading = false,
  onRefreshSales,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState<Partial<Sale>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sortBy, setSortBy] = useState<
    "date" | "amount" | "customer" | "product"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
    show: boolean;
  }>({ message: "", type: "success", show: false });

  // Create filters object for the hook
  const filters = React.useMemo(
    () => ({
      search: searchTerm,
      period,
      startDate,
      endDate,
    }),
    [searchTerm, period, startDate, endDate]
  );

  // Use infinite scroll hook
  const {
    sales,
    loading: salesLoading,
    hasMore,
    loadMore,
  } = useInfiniteSales(filters);

  // Combine loading states - if page is loading, don't show component loading
  const isPageLoading = isLoading;
  const isComponentLoading = salesLoading && !isPageLoading;

  useEffect(() => {
    customerService.getAll().then((data) => setCustomers(data.customers));
  }, []);

  const getCustomerName = (customerId: string | Customer | undefined) => {
    if (!customerId) return "-";

    // Eğer zaten bir nesne geldiyse
    if (typeof customerId === "object" && customerId !== null) {
      return customerId.name || "-";
    }

    if (!customers || !Array.isArray(customers) || customers.length === 0)
      return customerId;
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name : customerId;
  };

  // Satış mapping fonksiyonu
  const getSaleWithProduct = (sale: Sale) => {
    // Items array'i varsa ilk item'ı kullan
    if (sale.items && sale.items.length > 0) {
      const firstItem = sale.items[0];
      const customerName = getCustomerName(sale.customerId) || "-";
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

    // Eğer items yoksa boş obje döndür
    return {
      ...sale,
      price: 0,
      productName: "Ürün bulunamadı",
      barcode: "-",
      customerName: getCustomerName(sale.customerId) || "-",
      total: 0,
      quantity: 0,
    };
  };
  const salesWithProduct = useMemo(() => {
    // Loading durumunda veya sales array değilse boş array döndür
    if (isLoading || !Array.isArray(sales)) {
      return [];
    }

    if (!customers || customers.length === 0) {
      // Müşteriler henüz yüklenmemişse, müşteri adı olmadan döndür
      return sales.map((sale) => {
        const saleWithProduct = getSaleWithProduct(sale);
        return {
          ...saleWithProduct,
          customerName: sale.customerId || "-",
        };
      });
    }
    return sales.map(getSaleWithProduct);
  }, [sales, customers, isLoading]);

  // Filtreleme ve istatistiklerde salesWithProduct kullan
  const getFilteredSales = () => {
    // salesWithProduct array değilse boş array döndür
    if (!Array.isArray(salesWithProduct)) {
      return [];
    }

    let filtered = salesWithProduct;
    const now = new Date();
    switch (period) {
      case "today":
        filtered = filtered.filter(
          (sale) =>
            (sale.soldAt || sale.createdAt).split("T")[0] ===
            now.toISOString().split("T")[0]
        );
        break;
      case "week":
        const weekStart = format(new Date(), "yyyy-MM-dd");
        const weekEnd = format(new Date(), "yyyy-MM-dd");
        filtered = filtered.filter((sale) => {
          const saleDate = (sale.soldAt || sale.createdAt).split("T")[0];
          return saleDate >= weekStart && saleDate <= weekEnd;
        });
        break;
      case "month":
        const monthStart = format(new Date(), "yyyy-MM-01");
        const monthEnd = format(new Date(), "yyyy-MM-31");
        filtered = filtered.filter((sale) => {
          const saleDate = (sale.soldAt || sale.createdAt).split("T")[0];
          return saleDate >= monthStart && saleDate <= monthEnd;
        });
        break;
      case "custom":
        filtered = filtered.filter((sale) => {
          const saleDate = (sale.soldAt || sale.createdAt).split("T")[0];
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
          getCustomerName(sale.customerId)?.toLowerCase() || "";

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
          aValue = new Date(a.soldAt || a.createdAt).getTime();
          bValue = new Date(b.soldAt || b.createdAt).getTime();
          break;
        case "amount":
          aValue = a.total || 0;
          bValue = b.total || 0;
          break;
        case "customer":
          aValue = getCustomerName(a.customerId) || "";
          bValue = getCustomerName(b.customerId) || "";
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
            customer: getCustomerName(sale.customerId) || "-",
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            date: formatDateTime(sale.soldAt || sale.createdAt),
          });
        });
      } else {
        worksheet.addRow({
          product: sale.productName || "-",
          barcode: sale.barcode || "-",
          customer: getCustomerName(sale.customerId) || "-",
          quantity: sale.quantity,
          price: sale.price,
          total: sale.total,
          date: formatDateTime(sale.soldAt || sale.createdAt),
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
          setNotification({
            message: result.error || "Satış silme işlemi başarısız oldu.",
            type: "error",
            show: true,
          });
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

  const handleCustomerClick = (customerId: string | Customer) => {
    if (!customers || !Array.isArray(customers)) return;

    let customerIdStr: string;
    if (typeof customerId === "object" && customerId !== null) {
      customerIdStr = customerId._id || customerId.id;
    } else {
      customerIdStr = customerId as string;
    }

    const customer = customers.find((c) => c.id === customerIdStr);
    if (customer) {
      setSelectedCustomer(customer);
      setShowCustomerModal(true);
    }
  };

  // subCustomerId gösterimi için yardımcı fonksiyon ekle
  function getSubCustomerText(
    subCustomerId: string | { name: string; phone?: string } | undefined
  ) {
    if (subCustomerId && typeof subCustomerId === "object") {
      if (subCustomerId.name) {
        return (
          subCustomerId.name +
          (subCustomerId.phone ? ` (${subCustomerId.phone})` : "")
        );
      } else {
        return JSON.stringify(subCustomerId);
      }
    } else if (subCustomerId && typeof subCustomerId === "string") {
      return subCustomerId;
    }
    return "-";
  }

  const handlePriceUpdate = async (saleId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price: newPrice }),
      });

      if (response.ok) {
        if (onRefreshSales) {
          onRefreshSales();
        }
      } else {
        console.error("Fiyat güncellenirken hata oluştu");
      }
    } catch (error) {
      console.error("Fiyat güncelleme hatası:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Search and Filters Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg border border-purple-200 dark:border-gray-600 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Satış Arama ve Filtreleme
            </h2>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filtreler
            </span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Search Input - Always Visible */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Arama
          </label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ürün, barkod veya müşteri adı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
            />
          </div>
        </div>

        {/* Filters - Collapsible */}
        {showFilters && (
          <div className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Period Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dönem
                </label>
                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(
                      e.target.value as
                        | "all"
                        | "today"
                        | "week"
                        | "month"
                        | "custom"
                    )
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="all">Tümü</option>
                  <option value="today">Bugün</option>
                  <option value="week">Bu Hafta</option>
                  <option value="month">Bu Ay</option>
                  <option value="custom">Özel</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sıralama
                </label>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(
                      field as "date" | "amount" | "customer" | "product"
                    );
                    setSortOrder(order as "asc" | "desc");
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                >
                  <option value="date-desc">Tarih (Yeni {">"} Eski)</option>
                  <option value="date-asc">Tarih (Eski {">"} Yeni)</option>
                  <option value="amount-desc">
                    Tutar (Yüksek {">"} Düşük)
                  </option>
                  <option value="amount-asc">Tutar (Düşük {">"} Yüksek)</option>
                  <option value="customer-asc">Müşteri A-Z</option>
                  <option value="customer-desc">Müşteri Z-A</option>
                  <option value="product-asc">Ürün A-Z</option>
                  <option value="product-desc">Ürün Z-A</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setPeriod("all");
                    setStartDate(new Date().toISOString().split("T")[0]);
                    setEndDate(new Date().toISOString().split("T")[0]);
                    setSortBy("date");
                    setSortOrder("desc");
                  }}
                  className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Filtreleri Temizle
                </button>
                <button
                  onClick={exportToExcel}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Excel İndir
                </button>
              </div>
            </div>

            {/* Custom Date Range - Only show when custom is selected */}
            {period === "custom" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sales Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Satış Listesi
              </h2>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {sales.length} satış
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table header */}
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  ÜRÜN
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  BARKOD
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  MÜŞTERİ
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  ADET
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  TOPLAM
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  ÖDEME
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  TARİH
                </th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  ALT MÜŞTERİ
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  İŞLEMLER
                </th>
              </tr>
            </thead>
            {/* Table body */}
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isComponentLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        Yükleniyor...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          Satış bulunamadı
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Arama kriterlerinizi değiştirmeyi deneyin
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sales.flatMap((sale: Sale) => {
                  if (Array.isArray(sale.items) && sale.items.length > 0) {
                    return sale.items.map((item: SaleItem, idx: number) => {
                      return (
                        <tr
                          key={`${sale._id}-${idx}`}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-white font-semibold">
                            {item.productName || "-"}
                          </td>
                          <td className="px-3 py-2 text-xs text-primary-700 dark:text-primary-300 font-mono">
                            {item.barcode || "-"}
                          </td>
                          <td
                            className="px-3 py-2 text-xs text-primary-600 underline cursor-pointer font-semibold hover:text-primary-700 transition-colors"
                            onClick={() => {
                              const customerId = sale.customerId;
                              if (customerId) {
                                handleCustomerClick(customerId);
                              }
                            }}
                          >
                            {getCustomerName(sale.customerId)}
                          </td>
                          <td className="px-3 py-2 text-xs text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {item.quantity} adet
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-right font-mono font-semibold">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xxs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xxs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {sale.paymentType || "nakit"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xxs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {formatDateTime(sale.soldAt || sale.createdAt)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                            {getSubCustomerText(sale.subCustomerId)}
                          </td>
                          <td className="px-3 py-2 text-xs text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleEditClick(sale)}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xxs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                              >
                                Düzenle
                              </button>
                              <button
                                onClick={() => handleDeleteSale(sale._id)}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xxs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                              >
                                Sil
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  }
                  return null;
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Infinite Scroll Load More */}
      {hasMore && (
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={salesLoading}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isComponentLoading
                  ? "Satışlar yükleniyor..."
                  : "Daha Fazla Satış Yükle"}
              </button>
            </div>
          </div>
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
      
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg text-white ${
              notification.type === "success"
                ? "bg-green-500"
                : notification.type === "error"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button
                onClick={() =>
                  setNotification({ ...notification, show: false })
                }
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
