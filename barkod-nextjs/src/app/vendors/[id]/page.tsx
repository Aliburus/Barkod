"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Vendor,
  PurchaseOrder,
  VendorDebt,
  VendorPayment,
} from "../../../types";
import { vendorService } from "../../../services/vendorService";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import {
  ArrowLeft,
  Search,
  Package,
  DollarSign,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  AlertCircle,
} from "lucide-react";

// Custom hook for infinite scroll purchase orders
const useInfinitePurchaseOrders = (vendorId: string, filters: any) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    // Eğer filters null ise yükleme yapma
    if (!filters) {
      setOrders([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const fetchOrders = async () => {
      setLoading(true);
      setSkip(0);
      setHasMore(true);
      try {
        const params = new URLSearchParams();
        params.append("vendorId", vendorId);
        params.append("skip", "0");

        // Add filters
        if (filters.search) params.append("search", filters.search);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

        const response = await fetch(
          `/api/purchase-orders?${params.toString()}`
        );
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || data);
          setHasMore(data.hasMore || false);
          setSkip(data.nextSkip || 50);
        }
      } catch (error) {
        console.error("Siparişler yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    timeoutRef.current = setTimeout(fetchOrders, 150); // Reduced from 300ms to 150ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [vendorId, filters]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("vendorId", vendorId);
      params.append("skip", skip.toString());

      // Add filters
      if (filters.search) params.append("search", filters.search);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);

      const response = await fetch(`/api/purchase-orders?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setOrders((prev) => [...prev, ...(data.orders || data)]);
        setHasMore(data.hasMore || false);
        setSkip(data.nextSkip || skip + 50);
      }
    } catch (error) {
      console.error("Daha fazla sipariş yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  return { orders, loading, hasMore, loadMore };
};

// Custom hook for infinite scroll debts
const useInfiniteDebts = (vendorId: string, filters: any) => {
  const [debts, setDebts] = useState<VendorDebt[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    // Eğer filters null ise yükleme yapma
    if (!filters) {
      setDebts([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const fetchDebts = async () => {
      setLoading(true);
      setSkip(0);
      setHasMore(true);
      try {
        const params = new URLSearchParams();
        params.append("vendorId", vendorId);
        params.append("skip", "0");

        // Add filters
        if (filters.search) params.append("search", filters.search);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
        if (filters.amountRange)
          params.append("amountRange", filters.amountRange);
        if (filters.typeFilter) params.append("typeFilter", filters.typeFilter);

        const response = await fetch(`/api/my-debts?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setDebts(data.debts || data);
          setHasMore(data.hasMore || false);
          setSkip(data.nextSkip || 50);
        }
      } catch (error) {
        console.error("Borçlar yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    timeoutRef.current = setTimeout(fetchDebts, 150); // Reduced from 300ms to 150ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [vendorId, filters]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("vendorId", vendorId);
      params.append("skip", skip.toString());

      // Add filters
      if (filters.search) params.append("search", filters.search);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
      if (filters.amountRange)
        params.append("amountRange", filters.amountRange);
      if (filters.typeFilter) params.append("typeFilter", filters.typeFilter);

      const response = await fetch(`/api/my-debts?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setDebts((prev) => [...prev, ...(data.debts || data)]);
        setHasMore(data.hasMore || false);
        setSkip(data.nextSkip || skip + 50);
      }
    } catch (error) {
      console.error("Daha fazla borç yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  return { debts, loading, hasMore, loadMore };
};

// Custom hook for infinite scroll payments
const useInfinitePayments = (vendorId: string, filters: any) => {
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [skip, setSkip] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    // Eğer filters null ise yükleme yapma
    if (!filters) {
      setPayments([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const fetchPayments = async () => {
      setLoading(true);
      setSkip(0);
      setHasMore(true);
      try {
        const params = new URLSearchParams();
        params.append("vendorId", vendorId);
        params.append("skip", "0");

        // Add filters
        if (filters.search) params.append("search", filters.search);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.sortBy) params.append("sortBy", filters.sortBy);
        if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
        if (filters.amountRange)
          params.append("amountRange", filters.amountRange);
        if (filters.typeFilter) params.append("typeFilter", filters.typeFilter);

        const response = await fetch(`/api/my-payments?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setPayments(data.payments || data);
          setHasMore(data.hasMore || false);
          setSkip(data.nextSkip || 50);
        }
      } catch (error) {
        console.error("Ödemeler yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    timeoutRef.current = setTimeout(fetchPayments, 150); // Reduced from 300ms to 150ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [vendorId, filters]);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("vendorId", vendorId);
      params.append("skip", skip.toString());

      // Add filters
      if (filters.search) params.append("search", filters.search);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
      if (filters.amountRange)
        params.append("amountRange", filters.amountRange);
      if (filters.typeFilter) params.append("typeFilter", filters.typeFilter);

      const response = await fetch(`/api/my-payments?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPayments((prev) => [...prev, ...(data.payments || data)]);
        setHasMore(data.hasMore || false);
        setSkip(data.nextSkip || skip + 50);
      }
    } catch (error) {
      console.error("Daha fazla ödeme yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  return { payments, loading, hasMore, loadMore };
};

const VendorDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "debts" | "payments">(
    "orders"
  );
  const [showDebtsAndPayments, setShowDebtsAndPayments] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentType: "nakit",
    description: "",
    receiptNumber: "",
    notes: "",
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showFilters, setShowFilters] = useState(false);

  // Borç ve ödemeler için özel filtreler
  const [typeFilter, setTypeFilter] = useState<"all" | "debt" | "payment">(
    "all"
  );
  const [amountRange, setAmountRange] = useState<
    "all" | "low" | "medium" | "high"
  >("all");

  // Create filters object for hooks - optimized with useMemo
  const filters = React.useMemo(
    () => ({
      search: searchTerm,
      startDate,
      endDate,
      sortBy,
      sortOrder,
      typeFilter,
      amountRange,
    }),
    [searchTerm, startDate, endDate, sortBy, sortOrder, typeFilter, amountRange]
  );

  // Infinite scroll hooks - sadece aktif sekme için yükle
  const {
    orders,
    loading: ordersLoading,
    hasMore: ordersHasMore,
    loadMore: loadMoreOrders,
  } = useInfinitePurchaseOrders(
    vendorId,
    activeTab === "orders" ? filters : null
  );
  const {
    debts,
    loading: debtsLoading,
    hasMore: debtsHasMore,
    loadMore: loadMoreDebts,
  } = useInfiniteDebts(vendorId, activeTab === "debts" ? filters : null);
  const {
    payments,
    loading: paymentsLoading,
    hasMore: paymentsHasMore,
    loadMore: loadMorePayments,
  } = useInfinitePayments(vendorId, activeTab === "debts" ? filters : null);

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!vendorId) return;

      try {
        setLoading(true);
        console.log("Fetching data for vendor ID:", vendorId);

        // Vendor bilgilerini al - daha uzun timeout süresi ve retry mekanizması
        let vendorData;
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
          try {
            vendorData = await Promise.race([
              vendorService.getById(vendorId),
              new Promise((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error("Tedarikçi bilgileri yüklenirken zaman aşımı")
                    ),
                  30000 // 30 saniye timeout
                )
              ),
            ]);
            break; // Başarılı olursa döngüden çık
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw error; // Son deneme de başarısız olursa hatayı fırlat
            }
            console.log(`Deneme ${retryCount} başarısız, tekrar deneniyor...`);
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 saniye bekle
          }
        }
        setVendor(vendorData as Vendor);
      } catch (error) {
        console.error("Tedarikçi bilgileri yüklenirken hata:", error);
        // Hata durumunda kullanıcıya bilgi ver
        setError(error instanceof Error ? error.message : "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setTypeFilter("all");
    setAmountRange("all");
  };

  // Toplam borç ve ödeme hesaplama
  const totalDebts = debts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
  const totalPayments = payments.reduce(
    (sum, payment) => sum + (payment.amount || 0),
    0
  );
  const remainingDebt = totalDebts - totalPayments;

  // Ödeme form işlemleri
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendor) return;

    try {
      const paymentData = {
        vendorId: vendorId,
        vendorName: vendor.name,
        amount: parseFloat(paymentForm.amount),
        paymentType: paymentForm.paymentType,
        description: paymentForm.description,
        receiptNumber: paymentForm.receiptNumber,
        notes: paymentForm.notes,
      };

      const response = await fetch("/api/my-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        await response.json(); // Response'u oku ama kullanma
        // Refresh payments data
        window.location.reload();
        setShowPaymentModal(false);
        setPaymentForm({
          amount: "",
          paymentType: "nakit",
          description: "",
          receiptNumber: "",
          notes: "",
        });
      } else {
        console.error("Ödeme oluşturulurken hata");
      }
    } catch (error) {
      console.error("Ödeme gönderilirken hata:", error);
    }
  };

  const handlePaymentFormChange = (field: string, value: string) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const getTabData = () => {
    if (activeTab === "orders") {
      const allItems: Array<{
        id: string;
        date: string;
        productName: string;
        barcode: string;
        quantity: number;
        unitPrice: number;
        totalAmount: number;
        description: string;
      }> = [];

      orders.forEach((order) => {
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, index) => {
            // Her ürün için kendi tarihini kullan, yoksa sipariş tarihini kullan
            const itemDate = item.createdAt || order.createdAt;

            allItems.push({
              id: `${order._id}-${item.productId || item.barcode}`,
              date: itemDate
                ? format(parseISO(itemDate.toString()), "dd.MM.yyyy", {
                    locale: tr,
                  })
                : "-",
              productName: item.productName || "-",
              barcode: item.barcode || "-",
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              totalAmount: item.totalPrice || 0,
              description: index === 0 ? order.notes || "-" : "",
            });
          });
        }
      });

      return allItems;
    } else if (activeTab === "debts" && showDebtsAndPayments) {
      // Debts ve Payments'i birlikte göster
      const debtsData = debts.map((debt) => ({
        id: debt._id,
        date: debt.createdAt
          ? format(parseISO(debt.createdAt.toString()), "dd.MM.yyyy", {
              locale: tr,
            })
          : "-",
        type: "Borç",
        description: debt.description || "-",
        amount: debt.amount || 0,
        dueDate: debt.dueDate
          ? format(parseISO(debt.dueDate.toString()), "dd.MM.yyyy", {
              locale: tr,
            })
          : "-",
        notes: debt.description || "-",
      }));

      const paymentsData = payments.map((payment) => ({
        id: payment._id,
        date: payment.createdAt
          ? format(parseISO(payment.createdAt.toString()), "dd.MM.yyyy", {
              locale: tr,
            })
          : "-",
        type: "Ödeme",
        description: payment.description || "-",
        amount: payment.amount || 0,
        dueDate: "-",
        notes: payment.notes || "-",
      }));

      // Frontend filtreleme kaldırıldı - Backend'de yapılıyor

      const combinedData = [...debtsData, ...paymentsData];
      return combinedData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // En yeni en başta
      });
    } else if (activeTab === "debts") {
      return debts.map((debt) => ({
        id: debt._id,
        date: debt.createdAt
          ? format(parseISO(debt.createdAt.toString()), "dd.MM.yyyy", {
              locale: tr,
            })
          : "-",
        description: debt.description || "-",
        amount: debt.amount || 0,
        dueDate: debt.dueDate
          ? format(parseISO(debt.dueDate.toString()), "dd.MM.yyyy", {
              locale: tr,
            })
          : "-",
        status: debt.isPaid ? "Ödendi" : "Beklemede",
        notes: debt.description || "-",
      }));
    } else {
      return payments.map((payment) => ({
        id: payment._id,
        date: payment.createdAt
          ? format(parseISO(payment.createdAt.toString()), "dd.MM.yyyy", {
              locale: tr,
            })
          : "-",
        description: payment.description || "-",
        amount: payment.amount || 0,
        paymentMethod: payment.paymentType || "-",
        status: "Ödendi",
        notes: payment.notes || "-",
      }));
    }
  };

  const getTabHeaders = () => {
    if (activeTab === "orders") {
      return [
        { key: "date", label: "Tarih" },
        { key: "productName", label: "Ürün Adı" },
        { key: "barcode", label: "Barkod" },
        { key: "quantity", label: "Adet" },
        { key: "unitPrice", label: "Alış Fiyatı" },
        { key: "totalAmount", label: "Toplam Tutar" },
        { key: "description", label: "Açıklama" },
      ];
    } else if (activeTab === "debts" && showDebtsAndPayments) {
      return [
        { key: "date", label: "Tarih" },
        { key: "type", label: "Tür" },
        { key: "description", label: "Açıklama" },
        { key: "amount", label: "Tutar" },
        { key: "dueDate", label: "Vade Tarihi" },
        { key: "notes", label: "Notlar" },
      ];
    } else if (activeTab === "debts") {
      return [
        { key: "date", label: "Tarih" },
        { key: "description", label: "Açıklama" },
        { key: "amount", label: "Tutar" },
        { key: "dueDate", label: "Vade Tarihi" },
        { key: "status", label: "Durum" },
        { key: "notes", label: "Notlar" },
      ];
    } else {
      return [
        { key: "date", label: "Tarih" },
        { key: "description", label: "Açıklama" },
        { key: "amount", label: "Tutar" },
        { key: "paymentMethod", label: "Ödeme Yöntemi" },
        { key: "status", label: "Durum" },
        { key: "notes", label: "Notlar" },
      ];
    }
  };

  const getCurrentLoading = () => {
    if (activeTab === "orders") return ordersLoading;
    if (activeTab === "debts") return debtsLoading;
    return paymentsLoading;
  };

  const getCurrentHasMore = () => {
    if (activeTab === "orders") return ordersHasMore;
    if (activeTab === "debts") return debtsHasMore;
    return paymentsHasMore;
  };

  const getCurrentLoadMore = () => {
    if (activeTab === "orders") return loadMoreOrders;
    if (activeTab === "debts") return loadMoreDebts;
    return loadMorePayments;
  };

  const getSortOptions = () => {
    if (activeTab === "orders") {
      return [
        { value: "createdAt", label: "Tarih" },
        { value: "orderNumber", label: "Sipariş No" },
        { value: "totalAmount", label: "Toplam Tutar" },
      ];
    } else if (activeTab === "debts" || activeTab === "payments") {
      return [
        { value: "createdAt", label: "Tarih" },
        { value: "amount", label: "Tutar" },
        { value: "description", label: "Açıklama" },
      ];
    }
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Tedarikçi bilgileri yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Hata Oluştu
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Tedarikçi bulunamadı
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {vendor.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {vendor.phone && `${vendor.phone} • `}
              {vendor.email && `${vendor.email} • `}
              {vendor.address}
            </p>
          </div>
        </div>

        {/* Sağ üstte toplam bilgileri */}
        {activeTab === "debts" && showDebtsAndPayments && (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Toplam Borç:{" "}
              </span>
              <span className="font-semibold text-red-600">
                {totalDebts.toFixed(2)} ₺
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Toplam Ödeme:{" "}
              </span>
              <span className="font-semibold text-green-600">
                {totalPayments.toFixed(2)} ₺
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Kalan Borç:{" "}
              </span>
              <span
                className={`font-semibold ${
                  remainingDebt > 0 ? "text-red-600" : "text-green-600"
                }`}
              >
                {remainingDebt.toFixed(2)} ₺
              </span>
            </div>
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ödeme Yap
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Package className="w-4 h-4" />
            Alınan Ürünler
          </button>
          <button
            onClick={() => {
              setActiveTab("debts");
              setShowDebtsAndPayments(true);
            }}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "debts"
                ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-900/20"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Borçlar & Ödemeler
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={`${
                activeTab === "orders"
                  ? "Ürün adı, barkod veya açıklama ara..."
                  : activeTab === "debts" && showDebtsAndPayments
                  ? "Borç veya ödeme ara..."
                  : activeTab === "debts"
                  ? "Borç ara..."
                  : "Ödeme ara..."
              }`}
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtreler
          </button>

          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Temizle
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Başlangıç Tarihi
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            {/* Borç ve Ödemeler için özel filtreler */}
            {activeTab === "debts" && showDebtsAndPayments && (
              <>
                {/* Tip Filtresi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tip
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(
                        e.target.value as "all" | "debt" | "payment"
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">Tümü</option>
                    <option value="debt">Sadece Borçlar</option>
                    <option value="payment">Sadece Ödemeler</option>
                  </select>
                </div>

                {/* Tutar Aralığı Filtresi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tutar Aralığı
                  </label>
                  <select
                    value={amountRange}
                    onChange={(e) =>
                      setAmountRange(
                        e.target.value as "all" | "low" | "medium" | "high"
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="all">Tüm Tutarlar</option>
                    <option value="low">0 - 1.000 ₺</option>
                    <option value="medium">1.000 - 10.000 ₺</option>
                    <option value="high">10.000 ₺+</option>
                  </select>
                </div>
              </>
            )}

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sıralama
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {getSortOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sıralama Yönü
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder("asc")}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    sortOrder === "asc"
                      ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  <SortAsc className="w-4 h-4" />
                  Artan
                </button>
                <button
                  onClick={() => setSortOrder("desc")}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    sortOrder === "desc"
                      ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                      : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  <SortDesc className="w-4 h-4" />
                  Azalan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                {getTabHeaders().map((header) => (
                  <th
                    key={header.key}
                    className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {getTabData().length === 0 ? (
                <tr>
                  <td
                    colSpan={getTabHeaders().length}
                    className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600"
                  >
                    {searchTerm || startDate || endDate
                      ? "Filtre sonucu bulunamadı"
                      : getCurrentLoading()
                      ? "Yükleniyor..."
                      : `${
                          activeTab === "orders"
                            ? "Alınan ürün"
                            : activeTab === "debts" && showDebtsAndPayments
                            ? "Borç veya ödeme"
                            : activeTab === "debts"
                            ? "Borç"
                            : "Ödeme"
                        } bulunamadı`}
                  </td>
                </tr>
              ) : (
                getTabData().map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
                  >
                    {getTabHeaders().map((header) => (
                      <td
                        key={header.key}
                        className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-900 dark:text-white"
                      >
                        {header.key === "amount" ||
                        header.key === "unitPrice" ||
                        header.key === "totalAmount" ? (
                          <span
                            className={`font-semibold ${
                              // Borç ve ödemeler sekmesinde tip kontrolü yap
                              activeTab === "debts" &&
                              showDebtsAndPayments &&
                              "type" in item &&
                              (item as any).type === "Borç"
                                ? "text-red-600 dark:text-red-400" // Borçlar kırmızı
                                : "text-green-600 dark:text-green-400" // Ödemeler yeşil
                            }`}
                          >
                            {typeof item[header.key as keyof typeof item] ===
                            "number"
                              ? (
                                  item[
                                    header.key as keyof typeof item
                                  ] as unknown as number
                                ).toFixed(2)
                              : item[header.key as keyof typeof item]}{" "}
                            ₺
                          </span>
                        ) : header.key === "status" ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item[header.key as keyof typeof item] ===
                                "Ödendi" ||
                              item[header.key as keyof typeof item] ===
                                "Tamamlandı"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {item[header.key as keyof typeof item]}
                          </span>
                        ) : header.key === "type" ? (
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item[header.key as keyof typeof item] === "Borç"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            }`}
                          >
                            {item[header.key as keyof typeof item]}
                          </span>
                        ) : (
                          item[header.key as keyof typeof item]
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Infinite Scroll Load More */}
      {getCurrentHasMore() && (
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-center">
              <button
                onClick={getCurrentLoadMore()}
                disabled={getCurrentLoading()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {getCurrentLoading() ? "Yükleniyor..." : "Daha Fazla Yükle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ödeme Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ödeme Yap
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tutar (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) =>
                    handlePaymentFormChange("amount", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ödeme Tipi
                </label>
                <select
                  value={paymentForm.paymentType}
                  onChange={(e) =>
                    handlePaymentFormChange("paymentType", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="nakit">Nakit</option>
                  <option value="havale">Havale</option>
                  <option value="cek">Çek</option>
                  <option value="diger">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  value={paymentForm.description}
                  onChange={(e) =>
                    handlePaymentFormChange("description", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ödeme açıklaması"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Makbuz No
                </label>
                <input
                  type="text"
                  value={paymentForm.receiptNumber}
                  onChange={(e) =>
                    handlePaymentFormChange("receiptNumber", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Makbuz numarası"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notlar
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) =>
                    handlePaymentFormChange("notes", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Ek notlar"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ödeme Yap
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDetailPage;
