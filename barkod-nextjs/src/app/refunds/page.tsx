"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Refund } from "../../types";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import {
  Pencil,
  Search,
  Filter,
  X,
  Calendar,
  User,
  Users,
  RefreshCw,
} from "lucide-react";

interface RefundWithDetails extends Refund {
  customerName?: string;
  customerPhone?: string;
  subCustomerName?: string;
  subCustomerPhone?: string;
}

const RefundsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"my" | "incoming">("my");
  const [refunds, setRefunds] = useState<RefundWithDetails[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<RefundWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<
    "all" | "customer" | "subcustomer" | "date"
  >("all");
  const [filterValue, setFilterValue] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"single" | "range">(
    "single"
  );
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cache state'leri
  const [myRefundsCache, setMyRefundsCache] = useState<RefundWithDetails[]>([]);
  const [incomingRefundsCache, setIncomingRefundsCache] = useState<
    RefundWithDetails[]
  >([]);
  const [myRefundsLoaded, setMyRefundsLoaded] = useState(false);
  const [incomingRefundsLoaded, setIncomingRefundsLoaded] = useState(false);

  // Edit state'leri
  const [editingRefundId, setEditingRefundId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");

  // Tab değişimi için ayrı useEffect
  useEffect(() => {
    // Cache'de veri varsa loading gösterme
    if (
      (activeTab === "my" && myRefundsLoaded) ||
      (activeTab === "incoming" && incomingRefundsLoaded)
    ) {
      setLoading(false);
    } else {
      setLoading(true);
    }
    fetchRefunds();
  }, [activeTab]);

  // Arama için frontend filtreleme
  useEffect(() => {
    setFilteredRefunds(filterRefunds(refunds));
  }, [filterValue, refunds]);

  // Backend filtreleri için useEffect
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      // Sadece backend filtreleri değiştiğinde API çağrısı yap
      if (filterType === "date" || filterType === "customer" || filterType === "subcustomer") {
        fetchRefunds(true);
      }
    }, 300);
  }, [filterType, dateFilterType, dateRangeStart, dateRangeEnd]);

  const fetchRefunds = async (forceRefresh = false) => {
    try {
      // Cache kontrolü - eğer veri zaten yüklenmişse ve force refresh değilse cache'den al
      if (!forceRefresh) {
        if (activeTab === "my" && myRefundsLoaded) {
          const cachedData = myRefundsCache;
          setRefunds(cachedData);
          setFilteredRefunds(filterRefunds(cachedData));
          setLoading(false);
          return;
        }
        if (activeTab === "incoming" && incomingRefundsLoaded) {
          const cachedData = incomingRefundsCache;
          setRefunds(cachedData);
          setFilteredRefunds(filterRefunds(cachedData));
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      // Aktif sekmeye göre API endpoint'i seç
      let url = activeTab === "my" ? "/api/my-refunds" : "/api/refunds";
      const params = new URLSearchParams();

      // Sadece backend filtreleri gönder (tarih ve müşteri filtreleri)
      if (filterType === "date") {
        params.append("filterType", filterType);
        params.append("dateFilterType", dateFilterType);

        if (dateFilterType === "single" && filterValue) {
          params.append("filterValue", filterValue);
        } else if (dateFilterType === "range") {
          if (dateRangeStart) params.append("dateRangeStart", dateRangeStart);
          if (dateRangeEnd) params.append("dateRangeEnd", dateRangeEnd);
        }
      } else if (filterType === "customer" || filterType === "subcustomer") {
        if (filterValue) {
          params.append("filterType", filterType);
          params.append("filterValue", filterValue);
        }
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRefunds(data);
        setFilteredRefunds(filterRefunds(data));

        // Cache'e kaydet
        if (activeTab === "my") {
          setMyRefundsCache(data);
          setMyRefundsLoaded(true);
        } else {
          setIncomingRefundsCache(data);
          setIncomingRefundsLoaded(true);
        }
      }
    } catch (error) {
      console.error("İadeler getirilemedi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Edit fonksiyonları
  const handleEditReason = (refund: RefundWithDetails) => {
    setEditingRefundId(refund._id!);
    setReasonDraft(refund.reason || "");
  };

  const handleSaveReason = async (refund: RefundWithDetails) => {
    try {
      const response = await fetch(`/api/refunds`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refundId: refund._id, reason: reasonDraft }),
      });

      if (response.ok) {
        // Local state'i güncelle
        setRefunds((prevRefunds) =>
          prevRefunds.map((r) =>
            r._id === refund._id ? { ...r, reason: reasonDraft } : r
          )
        );
      } else {
        console.error("Açıklama güncellenemedi");
      }
    } catch (error) {
      console.error("Açıklama güncelleme hatası:", error);
    }
    setEditingRefundId(null);
    setReasonDraft("");
  };

  const handleCancelReason = () => {
    setEditingRefundId(null);
    setReasonDraft("");
  };

  // Cache temizleme fonksiyonu (sayfa yenilendiğinde)
  const clearCache = () => {
    setMyRefundsCache([]);
    setIncomingRefundsCache([]);
    setMyRefundsLoaded(false);
    setIncomingRefundsLoaded(false);
  };

  // Sayfa yüklendiğinde cache'i temizle
  useEffect(() => {
    clearCache();
  }, []);

  // Frontend filtreleme fonksiyonu
  const filterRefunds = (refundsToFilter: RefundWithDetails[]) => {
    if (!filterValue) {
      return refundsToFilter;
    }

    const searchTerm = filterValue.toLowerCase();
    return refundsToFilter.filter((refund) => {
      // Ürün adı arama
      if (refund.productName?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Barkod arama
      if (refund.barcode?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Açıklama arama
      if (refund.reason?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Müşteri adı arama (incoming refunds için)
      if (refund.customerName?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Alt müşteri adı arama (incoming refunds için)
      if (refund.subCustomerName?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      // Tedarikçi adı arama (my refunds için)
      if (refund.vendorName?.toLowerCase().includes(searchTerm)) {
        return true;
      }
      return false;
    });
  };

  const totalRefundAmount = filteredRefunds.reduce(
    (sum, refund) => sum + (refund.refundAmount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header activeTab="refunds" onAddProduct={() => {}} />
      <Navigation activeTab="refunds" onTabChange={() => {}} />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          {/* Tabs */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
              <button
                onClick={() => setActiveTab("my")}
                className={`relative px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ease-in-out transform ${
                  activeTab === "my"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg scale-105"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:scale-102"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activeTab === "my" ? "bg-blue-500" : "bg-gray-400"
                    }`}
                  ></div>
                  <span>Tedarikçi İadelerim</span>
                </div>
                {activeTab === "my" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("incoming")}
                className={`relative px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ease-in-out transform ${
                  activeTab === "incoming"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg scale-105"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:scale-102"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activeTab === "incoming" ? "bg-blue-500" : "bg-gray-400"
                    }`}
                  ></div>
                  <span>Müşteri İadeleri</span>
                </div>
                {activeTab === "incoming" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>
                )}
              </button>
            </div>
          </div>

          {/* Modern Filters and Stats */}
          <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
              {/* Search and Filters */}
              <div className="flex-1 w-full">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    {/* Search Bar */}
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                      </div>
                                              <input
                          type="text"
                          placeholder="Anında arama: ürün, barkod, müşteri, açıklama..."
                          value={filterValue}
                          onChange={(e) => setFilterValue(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        />
                    </div>

                    {/* Filter Type Dropdown */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Filter className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        value={filterType}
                        onChange={(e) => {
                          setFilterType(
                            e.target.value as
                              | "all"
                              | "customer"
                              | "subcustomer"
                              | "date"
                          );
                          setFilterValue("");
                        }}
                        className="block w-full pl-10 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all duration-200"
                      >
                        <option value="all">Tüm İadeler</option>
                        <option value="customer">Müşteriye Göre</option>
                        <option value="subcustomer">Alt Müşteriye Göre</option>
                        <option value="date">Tarihe Göre</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    {filterType === "date" && (
                      <div className="flex gap-2 items-center">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-5 w-5 text-gray-400" />
                          </div>
                          <select
                            value={dateFilterType}
                            onChange={(e) => {
                              setDateFilterType(
                                e.target.value as "single" | "range"
                              );
                              setFilterValue("");
                              setDateRangeStart("");
                              setDateRangeEnd("");
                            }}
                            className="block w-full pl-10 pr-8 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer transition-all duration-200"
                          >
                            <option value="single">Tek Tarih</option>
                            <option value="range">Tarih Aralığı</option>
                          </select>
                        </div>

                        {dateFilterType === "single" ? (
                          <input
                            type="date"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          />
                        ) : (
                          <div className="flex gap-2 items-center">
                            <input
                              type="date"
                              value={dateRangeStart}
                              onChange={(e) =>
                                setDateRangeStart(e.target.value)
                              }
                              placeholder="Başlangıç"
                              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            />
                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                              -
                            </span>
                            <input
                              type="date"
                              value={dateRangeEnd}
                              onChange={(e) => setDateRangeEnd(e.target.value)}
                              placeholder="Bitiş"
                              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Clear Filters Button */}
                    {(filterType !== "all" || filterValue) && (
                      <button
                        onClick={() => {
                          setFilterType("all");
                          setFilterValue("");
                          setDateRangeStart("");
                          setDateRangeEnd("");
                        }}
                        className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-red-300 dark:hover:border-red-600"
                      >
                        <X className="h-4 w-4" />
                        Temizle
                      </button>
                    )}

                    {/* Refresh Button */}
                    <button
                      onClick={() => fetchRefunds(true)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Yenile
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-400/30 p-2 rounded-lg">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{filteredRefunds.length}</div>
                      <div className="text-blue-100 text-sm font-medium">
                        Toplam İade
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white px-6 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-400/30 p-2 rounded-lg">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-bold">
                        {totalRefundAmount.toFixed(2)} ₺
                      </div>
                      <div className="text-green-100 text-sm font-medium">
                        Toplam Tutar
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-6">
                <div className="animate-pulse">
                  {/* Skeleton Header */}
                  <div className="bg-gray-200 dark:bg-gray-700 h-12 rounded-t-lg mb-4"></div>
                  {/* Skeleton Rows */}
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-gray-100 dark:bg-gray-800 h-16 mb-2 rounded"
                    ></div>
                  ))}
                </div>
              </div>
            ) : filteredRefunds.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400 text-lg">
                  İade kaydı bulunamadı
                </div>
                <p className="text-gray-400 dark:text-gray-500 mt-2">
                  Henüz hiç iade işlemi yapılmamış
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarih
                    </th>
                    {activeTab === "incoming" ? (
                      <>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          👤 Müşteri
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          👥 Alt Müşteri
                        </th>
                      </>
                    ) : (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        🏪 Tedarikçi
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      📦 Ürün Bilgileri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      🔢 Adet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      💰 İade Tutarı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      📝 Açıklama
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRefunds.map((refund, index) => (
                    <tr
                      key={refund._id}
                      className={`transition-all duration-200 hover:bg-blue-50 dark:hover:bg-gray-800 hover:shadow-sm ${
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50 dark:bg-gray-800"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {format(
                          parseISO(refund.createdAt),
                          "dd.MM.yyyy HH:mm",
                          {
                            locale: tr,
                          }
                        )}
                      </td>
                      {activeTab === "incoming" ? (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
                              {refund.customerName || "Bilinmeyen Müşteri"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {refund.customerPhone || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
                              {refund.subCustomerName || "-"}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {refund.subCustomerPhone || "-"}
                            </div>
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
                            {refund.vendorName || "Bilinmeyen Tedarikçi"}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-300">
                          {refund.productName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {refund.barcode}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        {refund.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                        {refund.refundAmount?.toFixed(2)} ₺
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditReason(refund)}
                            className="text-gray-400 hover:text-blue-500 p-0.5"
                            style={{
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          {editingRefundId === refund._id ? (
                            <>
                              <textarea
                                className="px-1 py-0.5 rounded border border-gray-400 text-xs bg-gray-900 text-white w-96 resize"
                                value={reasonDraft}
                                onChange={(e) => setReasonDraft(e.target.value)}
                                rows={2}
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveReason(refund)}
                                className="text-green-500 hover:text-green-700 text-xs"
                              >
                                ✔
                              </button>
                              <button
                                onClick={handleCancelReason}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                ✖
                              </button>
                            </>
                          ) : (
                            <span>{refund.reason || "İade işlemi"}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundsPage;
