"use client";

import React, { useState, useEffect } from "react";
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
import { ArrowLeft, Search, Package, DollarSign, Plus } from "lucide-react";

const VendorDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [myDebts, setMyDebts] = useState<VendorDebt[]>([]);
  const [myPayments, setMyPayments] = useState<VendorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        setLoading(true);
        console.log("Fetching data for vendor ID:", vendorId);

        // Vendor bilgilerini al
        const vendorData = await vendorService.getById(vendorId);
        setVendor(vendorData);

        // Tedarikçinin alınan ürünlerini al
        const purchaseOrdersResponse = await fetch(
          `/api/purchase-orders?vendorId=${vendorId}`
        );
        if (purchaseOrdersResponse.ok) {
          const purchaseOrdersData = await purchaseOrdersResponse.json();
          console.log("Purchase Orders Data:", purchaseOrdersData);
          setPurchaseOrders(purchaseOrdersData);
        } else {
          console.error(
            "Purchase orders fetch failed:",
            purchaseOrdersResponse.status
          );
        }

        // MyDebts ve MyPayments verilerini al
        const myDebtsResponse = await fetch(
          `/api/my-debts?vendorId=${vendorId}`
        );
        if (myDebtsResponse.ok) {
          const myDebtsData = await myDebtsResponse.json();
          // En yeni tarih en başta olacak şekilde sırala
          const sortedDebts = myDebtsData.sort(
            (a: { createdAt: string }, b: { createdAt: string }) => {
              const dateA = new Date(a.createdAt);
              const dateB = new Date(b.createdAt);
              return dateB.getTime() - dateA.getTime();
            }
          );
          setMyDebts(sortedDebts);
        }

        const myPaymentsResponse = await fetch(
          `/api/my-payments?vendorId=${vendorId}`
        );
        if (myPaymentsResponse.ok) {
          const myPaymentsData = await myPaymentsResponse.json();
          // En yeni tarih en başta olacak şekilde sırala
          const sortedPayments = myPaymentsData.sort(
            (a: { createdAt: string }, b: { createdAt: string }) => {
              const dateA = new Date(a.createdAt);
              const dateB = new Date(b.createdAt);
              return dateB.getTime() - dateA.getTime();
            }
          );
          setMyPayments(sortedPayments);
        }

        // Diğer verileri al (placeholder - gerçek API'ler eklenecek)
        // setVendorDebts(await vendorService.getVendorDebtsByVendor(vendorId));
        // setVendorPayments(await vendorService.getVendorPaymentsByVendor(vendorId));
      } catch (error) {
        console.error("Tedarikçi bilgileri yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) {
      fetchVendorData();
    }
  }, [vendorId]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Toplam borç ve ödeme hesaplama
  const totalDebts = myDebts.reduce((sum, debt) => sum + (debt.amount || 0), 0);
  const totalPayments = myPayments.reduce(
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
        const newPayment = await response.json();
        setMyPayments([newPayment, ...myPayments]);
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

  const clearSearch = () => {
    setSearchTerm("");
  };

  const filteredData = () => {
    if (activeTab === "orders") {
      const data = purchaseOrders;
      if (!searchTerm) return data;
      return data.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.orderNumber?.toLowerCase().includes(searchLower) ||
          item.items?.some((orderItem) =>
            orderItem.productName?.toLowerCase().includes(searchLower)
          )
        );
      });
    } else if (activeTab === "debts" && showDebtsAndPayments) {
      // MyDebts ve MyPayments'i birlikte filtrele
      const allData = [...myDebts, ...myPayments];
      if (!searchTerm) return allData;
      return allData.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return item.description?.toLowerCase().includes(searchLower);
      });
    } else if (activeTab === "debts") {
      const debtsData = myDebts;
      if (!searchTerm) return debtsData;
      return debtsData.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return item.description?.toLowerCase().includes(searchLower);
      });
    } else {
      const paymentsData = myPayments;
      if (!searchTerm) return paymentsData;
      return paymentsData.filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return item.description?.toLowerCase().includes(searchLower);
      });
    }
  };

  const getTabData = () => {
    if (activeTab === "orders") {
      const data = filteredData() as PurchaseOrder[];
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

      data.forEach((order) => {
        if (order.items && order.items.length > 0) {
          order.items.forEach((item, index) => {
            allItems.push({
              id: `${order._id}-${item.productId || item.barcode}`,
              date:
                index === 0
                  ? order.createdAt
                    ? format(
                        parseISO(order.createdAt.toString()),
                        "dd.MM.yyyy",
                        {
                          locale: tr,
                        }
                      )
                    : "-"
                  : "",
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
      // MyDebts ve MyPayments'i birlikte göster
      const debts = myDebts.map((debt) => ({
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

      const payments = myPayments.map((payment) => ({
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

      const combinedData = [...debts, ...payments];
      return combinedData.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime(); // En yeni en başta
      });
    } else if (activeTab === "debts") {
      const data = filteredData() as VendorDebt[];
      return data.map((debt) => ({
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
      const data = filteredData() as VendorPayment[];
      return data.map((payment) => ({
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

      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`${
              activeTab === "orders"
                ? "Alınan ürün"
                : activeTab === "debts" && showDebtsAndPayments
                ? "Borç veya ödeme"
                : activeTab === "debts"
                ? "Borç"
                : "Ödeme"
            } ara...`}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
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
                    {searchTerm
                      ? "Arama sonucu bulunamadı"
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
                          <span className="font-semibold text-green-600">
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
