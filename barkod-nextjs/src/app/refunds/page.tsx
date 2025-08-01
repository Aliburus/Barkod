"use client";

import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Refund } from "../../types";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { Pencil } from "lucide-react";

interface RefundWithDetails extends Refund {
  customerName?: string;
  customerPhone?: string;
  subCustomerName?: string;
  subCustomerPhone?: string;
}

const RefundsPage: React.FC = () => {
  const [refunds, setRefunds] = useState<RefundWithDetails[]>([]);
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

  // Edit state'leri
  const [editingRefundId, setEditingRefundId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchRefunds();
    }, 500);
  }, [filterType, filterValue, dateFilterType, dateRangeStart, dateRangeEnd]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      let url = "/api/refunds";
      const params = new URLSearchParams();

      if (filterType !== "all") {
        if (filterType === "date") {
          params.append("filterType", filterType);
          params.append("dateFilterType", dateFilterType);

          if (dateFilterType === "single" && filterValue) {
            params.append("filterValue", filterValue);
          } else if (dateFilterType === "range") {
            if (dateRangeStart) params.append("dateRangeStart", dateRangeStart);
            if (dateRangeEnd) params.append("dateRangeEnd", dateRangeEnd);
          }
        } else if (filterValue) {
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

  const totalRefundAmount = refunds.reduce(
    (sum, refund) => sum + (refund.refundAmount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header activeTab="refunds" onAddProduct={() => {}} />
      <Navigation activeTab="refunds" onTabChange={() => {}} />
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
          {/* Filters and Stats */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                {/* Filter Type */}
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
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                >
                  <option value="all">🔍 Tümü</option>
                  <option value="customer">👤 Müşteriye Göre</option>
                  <option value="subcustomer">👥 Alt Müşteriye Göre</option>
                  <option value="date">📅 Tarihe Göre</option>
                </select>

                {/* Filter Value */}
                {filterType !== "all" && (
                  <div className="relative">
                    {filterType === "date" ? (
                      <div className="flex gap-2 items-center">
                        {/* Date Filter Type */}
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
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="single">📅 Tek Tarih</option>
                          <option value="range">📅📅 Tarih Aralığı</option>
                        </select>

                        {/* Date Inputs */}
                        {dateFilterType === "single" ? (
                          <input
                            type="date"
                            value={filterValue}
                            onChange={(e) => setFilterValue(e.target.value)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <span className="text-gray-500 dark:text-gray-400">
                              -
                            </span>
                            <input
                              type="date"
                              value={dateRangeEnd}
                              onChange={(e) => setDateRangeEnd(e.target.value)}
                              placeholder="Bitiş"
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={
                          filterType === "customer"
                            ? "Müşteri adı girin..."
                            : "Alt müşteri adı girin..."
                        }
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[200px]"
                      />
                    )}
                  </div>
                )}

                {/* Clear Filter Button */}
                {filterType !== "all" &&
                  ((filterType === "date" &&
                    dateFilterType === "single" &&
                    filterValue) ||
                    (filterType === "date" &&
                      dateFilterType === "range" &&
                      (dateRangeStart || dateRangeEnd)) ||
                    (filterType !== "date" && filterValue)) && (
                    <button
                      onClick={() => {
                        setFilterType("all");
                        setFilterValue("");
                        setDateRangeStart("");
                        setDateRangeEnd("");
                      }}
                      className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                      ✕ Temizle
                    </button>
                  )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {refunds.length}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    📦 Toplam İade
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {totalRefundAmount.toFixed(2)} ₺
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    💰 Toplam Tutar
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  İadeler yükleniyor...
                </span>
              </div>
            ) : refunds.length === 0 ? (
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
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      👤 Müşteri
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      👥 Alt Müşteri
                    </th>
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
                  {refunds.map((refund) => (
                    <tr
                      key={refund._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
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
