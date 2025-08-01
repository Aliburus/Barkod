import React, { useState, useRef } from "react";
import { Debt, CustomerPayment } from "../../types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Pencil } from "lucide-react";
import { refundService } from "../../services/refundService";
import { Refund } from "../../types";

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string;
  debts: Debt[];
  payments: CustomerPayment[];
  type: "debt" | "payment";
  subCustomerId?: string; // <-- eklendi
  onDataRefresh?: () => void; // İade işleminden sonra veri yenileme için
  onNotification?: (
    message: string,
    type: "success" | "error" | "warning"
  ) => void;
}

const DebtDetailsModal: React.FC<DebtDetailsModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  debts,
  payments,
  type,
  subCustomerId, // <-- eklendi
  onDataRefresh, // İade işleminden sonra veri yenileme için
  onNotification,
}) => {
  const [filterType, setFilterType] = useState<
    "all" | "debts" | "payments" | "refunds"
  >("all");
  const [loading, setLoading] = useState(false);
  const [filteredData, setFilteredData] = useState<{
    debts: Debt[];
    payments: CustomerPayment[];
    totalDebt: number;
    totalPaid: number;
    remainingDebt: number;
  }>({ debts: [], payments: [], totalDebt: 0, totalPaid: 0, remainingDebt: 0 });
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [descDraft, setDescDraft] = useState<string>("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentDescDraft, setPaymentDescDraft] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExtraFilter, setSelectedExtraFilter] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const productTimeout = useRef<NodeJS.Timeout | null>(null);
  const [refundedItems, setRefundedItems] = useState<Set<string>>(new Set());
  const [refundLoading, setRefundLoading] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);
  const [pendingRefund, setPendingRefund] = useState<{
    debt: Debt;
    productDetail: {
      productId?: string;
      productName?: string;
      barcode?: string;
      quantity?: number;
      price?: number;
    };
    index: number;
  } | null>(null);
  const [showCustomerRefundModal, setShowCustomerRefundModal] = useState(false);
  const [customerRefundAmount, setCustomerRefundAmount] = useState("");

  // Tek hesaplama sistemi - tüm sekmeler için ortak
  const getCalculations = () => {
    if (!subCustomerId) {
      return {
        totalDebt: 0,
        totalPayments: 0,
        totalRefunded: 0,
        remainingDebt: 0,
        customerRefunds: 0,
        excessPayment: 0,
      };
    }

    // Tüm borçları hesapla
    const totalDebt = debts
      .filter((d) => {
        return (
          d.subCustomerId === subCustomerId ||
          (typeof d.subCustomerId === "object" &&
            d.subCustomerId?._id === subCustomerId)
        );
      })
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    // Tüm ödemeleri hesapla (sadece pozitif olanlar)
    const totalPayments = payments
      .filter((p) => {
        return (
          p.subCustomerId === subCustomerId ||
          (typeof p.subCustomerId === "object" &&
            p.subCustomerId?._id === subCustomerId)
        );
      })
      .filter((p) => p.amount > 0) // Sadece pozitif ödemeler
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    // İade edilen tutarları hesapla
    const totalRefunded = debts
      .filter((d) => {
        return (
          d.subCustomerId === subCustomerId ||
          (typeof d.subCustomerId === "object" &&
            d.subCustomerId?._id === subCustomerId)
        );
      })
      .reduce((sum, d) => sum + (d.refundedAmount || 0), 0);

    // Subcustomer'a yapılan geri ödemeleri hesapla (negatif ödemeler)
    const customerRefunds = payments
      .filter((p) => {
        return (
          p.subCustomerId === subCustomerId ||
          (typeof p.subCustomerId === "object" &&
            p.subCustomerId?._id === subCustomerId)
        );
      })
      .filter((p) => p.amount < 0)
      .reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);

    // Kalan borç
    const remainingDebt = Math.max(
      0,
      totalDebt - totalPayments - totalRefunded
    );

    // Fazla ödeme
    const excessPayment = Math.max(
      0,
      totalPayments + totalRefunded - totalDebt - customerRefunds
    );

    return {
      totalDebt,
      totalPayments,
      totalRefunded,
      remainingDebt,
      customerRefunds,
      excessPayment,
    };
  };

  const calculations = getCalculations();

  // İade işlemi
  const handleRefund = async (
    debt: Debt,
    productDetail: {
      productId?: string;
      productName?: string;
      barcode?: string;
      quantity?: number;
      price?: number;
    },
    index: number
  ) => {
    // Onay modalını göster
    setPendingRefund({ debt, productDetail, index });
    setShowRefundConfirm(true);
  };

  // İade onayı
  const confirmRefund = async () => {
    if (!pendingRefund) return;

    const { debt, productDetail, index } = pendingRefund;
    const refundKey = `${debt._id}-${index}`;
    setRefundLoading(refundKey);

    try {
      // Toplam fiyatı hesapla
      const totalPrice =
        (productDetail.price || 0) * (productDetail.quantity || 1);

      const refundData = {
        debtId: debt._id!,
        productId: productDetail.productId || productDetail.barcode || "",
        productName: productDetail.productName || "Bilinmeyen Ürün",
        barcode: productDetail.barcode || "",
        quantity: productDetail.quantity || 1,
        refundAmount: totalPrice,
        customerId:
          typeof debt.customerId === "string"
            ? debt.customerId
            : debt.customerId?._id || "",
        subCustomerId: debt.subCustomerId
          ? typeof debt.subCustomerId === "string"
            ? debt.subCustomerId
            : debt.subCustomerId._id
          : undefined,
        reason: "İade işlemi",
      };

      await refundService.createRefund(refundData);

      // İade edilen ürünü hemen görsel olarak güncelle
      setRefundedItems((prev) =>
        new Set(prev).add(`${debt._id}-${productDetail.barcode}`)
      );

      const newRefunds = await refundService.getRefundsByDebtId(debt._id!);
      setRefunds(newRefunds);

      if (onDataRefresh) {
        onDataRefresh();
      }

      await fetchFilteredData(
        filterType,
        searchTerm,
        selectedExtraFilter,
        productSearch
      );
      setTimeout(() => {
        fetchFilteredData(
          filterType,
          searchTerm,
          selectedExtraFilter,
          productSearch
        );
      }, 500);
      setTimeout(() => {
        fetchFilteredData(
          filterType,
          searchTerm,
          selectedExtraFilter,
          productSearch
        );
      }, 2000);

      setRefreshTrigger((prev) => prev + 1);
      onNotification?.("İade işlemi başarıyla tamamlandı!", "success");
    } catch (error) {
      console.error("İade işlemi hatası:", error);
      onNotification?.(
        error instanceof Error
          ? error.message
          : "İade işlemi sırasında bir hata oluştu.",
        "error"
      );
    } finally {
      setRefundLoading(null);
      setShowRefundConfirm(false);
      setPendingRefund(null);
    }
  };

  // İade iptali
  const cancelRefund = () => {
    setShowRefundConfirm(false);
    setPendingRefund(null);
  };

  // İade durumunu kontrol et
  const isProductRefunded = (
    debt: Debt,
    item: {
      barcode?: string;
      productName?: string;
      quantity?: number;
      price?: number;
    }
  ) => {
    // Önce local state'ten kontrol et
    const refundKey = `${debt._id}-${item.barcode}`;
    if (refundedItems.has(refundKey)) {
      return true;
    }

    // Sonra API'den gelen refunds listesinden kontrol et
    return refunds.some(
      (refund) =>
        (typeof refund.debtId === "string"
          ? refund.debtId
          : refund.debtId._id) === debt._id && refund.barcode === item.barcode
    );
  };

  // Filter değiştiğinde backend'den veri çek
  const fetchFilteredData = async (
    newFilterType: "all" | "debts" | "payments" | "refunds",
    search?: string,
    extraFilter?: string,
    productName?: string
  ) => {
    setLoading(true);
    try {
      // Customer ID'yi debts veya payments'dan al
      const customerId = debts[0]?.customerId || payments[0]?.customerId;
      if (!customerId) {
        setFilteredData({
          debts: [],
          payments: [],
          totalDebt: 0,
          totalPaid: 0,
          remainingDebt: 0,
        });
        return;
      }

      let url = `/api/debts/customer/${customerId}?filter=${newFilterType}`;
      if (subCustomerId) url += `&subCustomerId=${subCustomerId}`; // <-- eklendi
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (extraFilter) url += `&type=${encodeURIComponent(extraFilter)}`;
      if (productName) url += `&productName=${encodeURIComponent(productName)}`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFilteredData({
          debts: data.debts || [],
          payments: data.payments || [],
          totalDebt: data.totalDebt || 0,
          totalPaid: data.totalPaid || 0,
          remainingDebt: data.remainingDebt || 0,
        });
      }
    } catch (error) {
      console.error("Filtrelenmiş veri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  // İlk yüklemede tüm verileri çek
  React.useEffect(() => {
    if (isOpen) {
      // Props'tan gelen verileri kullan, backend'den tekrar çekme
      setFilteredData({
        debts: debts || [],
        payments: payments || [],
        totalDebt: debts.reduce((sum, d) => sum + (d.amount || 0), 0),
        totalPaid: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
        remainingDebt:
          debts.reduce((sum, d) => sum + (d.amount || 0), 0) -
          payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      });
    }
  }, [isOpen, debts, payments]);

  // İade işleminden sonra verileri yenile
  React.useEffect(() => {
    if (isOpen && debts.length > 0) {
      // Borç verilerini tamamen yeniden yükle
      fetchFilteredData(
        filterType,
        searchTerm,
        selectedExtraFilter,
        productSearch
      );
    }
  }, [debts]); // debts değiştiğinde yeniden yükle

  // İlk yüklemede mevcut iadeleri getir
  React.useEffect(() => {
    const fetchRefunds = async () => {
      if (debts.length > 0) {
        try {
          const customerId =
            typeof debts[0].customerId === "string"
              ? debts[0].customerId
              : debts[0].customerId._id;

          // SubCustomer için refunds filtreleme
          let refundsData = await refundService.getRefundsByCustomerId(
            customerId
          );

          if (subCustomerId) {
            // Sadece bu SubCustomer'ın borçlarına ait refunds'ları filtrele
            const subCustomerDebtIds = debts.map((debt) => debt._id);
            refundsData = refundsData.filter((refund) =>
              subCustomerDebtIds.includes(
                typeof refund.debtId === "string"
                  ? refund.debtId
                  : refund.debtId._id
              )
            );
          }

          setRefunds(refundsData);
        } catch (error) {
          console.error("İadeler getirilemedi:", error);
        }
      }
    };

    fetchRefunds();
  }, [debts, subCustomerId]);

  // Refresh trigger değiştiğinde verileri yenile
  React.useEffect(() => {
    if (refreshTrigger > 0 && isOpen) {
      fetchFilteredData(
        filterType,
        searchTerm,
        selectedExtraFilter,
        productSearch
      );
    }
  }, [refreshTrigger]);

  // Refunds listesi değiştiğinde local state'i güncelle
  React.useEffect(() => {
    if (refunds.length > 0 && debts.length > 0) {
      const refundedSet = new Set<string>();
      refunds.forEach((refund) => {
        const refundDebtId =
          typeof refund.debtId === "string" ? refund.debtId : refund.debtId._id;
        debts.forEach((debt) => {
          if (debt._id === refundDebtId) {
            // productDetails varsa onu kullan
            if (debt.productDetails && Array.isArray(debt.productDetails)) {
              debt.productDetails.forEach((product) => {
                if (product.barcode === refund.barcode) {
                  refundedSet.add(`${debt._id}-${product.barcode}`);
                }
              });
            }
            // Eski saleId.items yapısı için
            else if (
              debt.saleId &&
              typeof debt.saleId === "object" &&
              debt.saleId.items
            ) {
              debt.saleId.items.forEach((item) => {
                if (item.barcode === refund.barcode) {
                  refundedSet.add(`${debt._id}-${item.barcode}`);
                }
              });
            }
            // Tek ürün satışı için
            else if (
              debt.saleId &&
              typeof debt.saleId === "object" &&
              debt.saleId.barcode
            ) {
              if (debt.saleId.barcode === refund.barcode) {
                refundedSet.add(`${debt._id}-${debt.saleId.barcode}`);
              }
            }
          }
        });
      });
      setRefundedItems(refundedSet);
    }
  }, [refunds, debts]);

  // Filter değiştiğinde veri çek
  const handleFilterChange = (
    newFilterType: "all" | "debts" | "payments" | "refunds"
  ) => {
    setFilterType(newFilterType);
    // Props'tan gelen verileri kullan
    setFilteredData({
      debts:
        newFilterType === "all" ||
        newFilterType === "debts" ||
        newFilterType === "refunds"
          ? debts
          : [],
      payments:
        newFilterType === "all" || newFilterType === "payments" ? payments : [],
      totalDebt: debts.reduce((sum, d) => sum + (d.amount || 0), 0),
      totalPaid: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      remainingDebt:
        debts.reduce((sum, d) => sum + (d.amount || 0), 0) -
        payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    });
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchFilteredData(filterType, term, selectedExtraFilter, productSearch);
    }, 500);
  };
  const handleProductSearchChange = (term: string) => {
    setProductSearch(term);
    if (productTimeout.current) clearTimeout(productTimeout.current);
    productTimeout.current = setTimeout(() => {
      fetchFilteredData(filterType, undefined, undefined, term);
    }, 500);
  };
  const handleExtraFilterChange = (val: string) => {
    setSelectedExtraFilter(val);
    fetchFilteredData(filterType, searchTerm, val, productSearch);
  };

  const handleEditDesc = (debt: Debt) => {
    setEditingDescId(debt._id ?? "");
    setDescDraft(debt.description ?? "");
  };

  const handleSaveDesc = async (debt: Debt) => {
    try {
      await fetch(`/api/debts/${debt._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: descDraft }),
      });
      debt.description = descDraft;
    } catch (e) {
      // Hata yönetimi eklenebilir
    }
    setEditingDescId(null);
    setDescDraft("");
  };
  const handleCancelDesc = () => {
    setEditingDescId(null);
    setDescDraft("");
  };

  // Ödeme açıklaması edit fonksiyonları
  const handleEditPaymentDesc = (payment: CustomerPayment) => {
    setEditingPaymentId(payment._id!);
    setPaymentDescDraft(payment.description || "");
  };

  const handleSavePaymentDesc = async (payment: CustomerPayment) => {
    try {
      const response = await fetch(`/api/payments/${payment._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: paymentDescDraft,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Açıklama güncellenemedi");
      }

      // Veri yenileme callback'ini çağır
      if (onDataRefresh) {
        onDataRefresh();
      }

      // Modal içindeki verileri yenile
      await fetchFilteredData(
        filterType,
        searchTerm,
        selectedExtraFilter,
        productSearch
      );

      setEditingPaymentId(null);
      setPaymentDescDraft("");
    } catch (error) {
      console.error("Açıklama güncelleme hatası:", error);
      onNotification?.(
        error instanceof Error
          ? error.message
          : "Açıklama güncellenirken bir hata oluştu.",
        "error"
      );
    }
  };

  const handleCancelPaymentDesc = () => {
    setEditingPaymentId(null);
    setPaymentDescDraft("");
  };

  // Subcustomer'a yapılacak geri ödeme işlemi
  const handleSubCustomerRefund = async (amount: number) => {
    if (amount <= 0) {
      onNotification?.("Geçerli bir tutar girin.", "warning");
      return;
    }

    try {
      const refundData = {
        customerId:
          typeof debts[0]?.customerId === "string"
            ? debts[0].customerId
            : debts[0]?.customerId?._id,
        subCustomerId: subCustomerId,
        amount: -amount, // Negatif tutar olarak kaydet
        paymentDate: new Date().toISOString(),
        paymentType: "nakit",
        description: "Subcustomer'a geri ödeme",
        status: "active",
      };

      const response = await fetch("/api/customer-payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(refundData),
      });

      if (!response.ok) {
        throw new Error("Subcustomer geri ödeme işlemi başarısız");
      }

      onNotification?.(
        `Subcustomer'a ${amount.toFixed(2)} TL geri ödeme yapıldı.`,
        "success"
      );

      // Veri yenileme callback'ini çağır
      if (onDataRefresh) {
        onDataRefresh();
      }

      // Modal'ı kapat
      onClose();
    } catch (error) {
      console.error("Subcustomer geri ödeme hatası:", error);
      onNotification?.(
        "Subcustomer geri ödeme işlemi sırasında bir hata oluştu.",
        "error"
      );
    }
  };

  // Sekme sayılarını hesapla
  const getTabCounts = () => {
    if (!subCustomerId) {
      return {
        all: 0,
        debts: 0,
        payments: 0,
        refunds: 0,
      };
    }

    // Borç sayısı
    const debtCount = debts.filter((d) => {
      return (
        d.subCustomerId === subCustomerId ||
        (typeof d.subCustomerId === "object" &&
          d.subCustomerId?._id === subCustomerId)
      );
    }).length;

    // Ödeme sayısı (pozitif ve negatif)
    const paymentCount = payments.filter((p) => {
      return (
        p.subCustomerId === subCustomerId ||
        (typeof p.subCustomerId === "object" &&
          p.subCustomerId?._id === subCustomerId)
      );
    }).length;

    // İade sayısı
    let refundCount = 0;
    debts.forEach((debt) => {
      if (
        debt.subCustomerId === subCustomerId ||
        (typeof debt.subCustomerId === "object" &&
          debt.subCustomerId?._id === subCustomerId)
      ) {
        if (debt.productDetails && Array.isArray(debt.productDetails)) {
          debt.productDetails.forEach((detail) => {
            if (isProductRefunded(debt, detail)) {
              refundCount++;
            }
          });
        }
      }
    });

    return {
      all: debtCount + paymentCount,
      debts: debtCount,
      payments: paymentCount,
      refunds: refundCount,
    };
  };

  const tabCounts = getTabCounts();

  // Debug: Sekme sayılarını kontrol et
  console.log("Debug - Tab Counts:", tabCounts);
  console.log("Debug - Debts:", debts);
  console.log("Debug - Payments:", payments);
  console.log("Debug - SubCustomerId:", subCustomerId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-0">
      <div className="bg-white dark:bg-gray-900 rounded-none shadow-xl w-full h-auto max-w-none max-h-none min-h-[600px] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {customerName} - Borç ve Ödeme Detayları
            {customerPhone && (
              <span className="block text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                📞 {customerPhone}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="ml-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
          >
            <span className="sr-only">Kapat</span>
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {/* GENEL ÖZET EN ÜSTE ALINDI */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="flex flex-wrap gap-6 bg-gray-800/60 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-700">
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Borç:</span>
              <span className="ml-2 font-semibold text-red-500">
                {calculations.remainingDebt.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Toplam Ödeme:</span>
              <span className="ml-2 font-semibold text-green-500">
                {calculations.totalPayments.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">İade Edilen Toplam Tutar:</span>
              <span className="ml-2 font-semibold text-orange-500">
                {calculations.totalRefunded.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Geri Ödeme:</span>
              <span className="ml-2 font-semibold text-yellow-500">
                {calculations.customerRefunds.toFixed(2)} ₺
              </span>
              {(() => {
                if (!subCustomerId) return null;

                // Eğer kalan borç varsa, ödeme gerekli
                if (calculations.remainingDebt > 0) {
                  return (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                      {calculations.remainingDebt.toFixed(2)} ₺ ödeme gerekli
                    </span>
                  );
                }

                // Eğer kalan borç yoksa, fazla ödeme var mı kontrol et
                if (calculations.excessPayment > 0) {
                  return (
                    <button
                      onClick={() => {
                        setShowCustomerRefundModal(true);
                        setCustomerRefundAmount("");
                      }}
                      className="ml-2 px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Geri Öde
                    </button>
                  );
                }

                // Eğer sıfır ise, borç yok
                return (
                  <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                    Borç yok
                  </span>
                );
              })()}
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Satış:</span>
              <span className="ml-2 font-semibold text-blue-500">
                {calculations.totalDebt.toFixed(2)} ₺
              </span>
            </div>
            {loading && (
              <div className="flex-1 min-w-[120px]">
                <span className="text-yellow-400 text-sm">
                  🔄 Veriler güncelleniyor...
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col">
          {type === "debt" ? (
            // Borç ve ödeme detayları
            <div className="flex-1 flex flex-col">
              {/* Filtre Butonları */}
              <div className="mb-4 flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => handleFilterChange("all")}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Tümü ({tabCounts.all})
                </button>
                <button
                  onClick={() => handleFilterChange("debts")}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === "debts"
                      ? "bg-red-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Borçlar ({tabCounts.debts})
                </button>
                <button
                  onClick={() => handleFilterChange("payments")}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === "payments"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Ödemeler ({tabCounts.payments})
                </button>
                <button
                  onClick={() => handleFilterChange("refunds")}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === "refunds"
                      ? "bg-orange-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  İadeler ({tabCounts.refunds})
                </button>
                {/* Search alanları */}
                <div className="flex gap-2 items-center ml-4">
                  <input
                    type="text"
                    placeholder="Ürün adı veya kodu ile ara..."
                    value={productSearch}
                    onChange={(e) => handleProductSearchChange(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-400 text-sm bg-gray-900 text-white w-64"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="mb-4 flex-shrink-0">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  {filterType === "all" && "Tüm İşlem Detayları"}
                  {filterType === "debts" && "Borç Detayları"}
                  {filterType === "payments" && "Ödeme Detayları"}
                  {filterType === "refunds" && "İade Detayları"}
                </h4>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Veriler yükleniyor...
                    </span>
                  </div>
                ) : filteredData.debts.length === 0 &&
                  filteredData.payments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    İşlem kaydı bulunamadı.
                  </p>
                ) : (
                  <div className="flex-1 overflow-y-auto max-h-[400px]">
                    <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Tarih
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Ürün Kodu
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Ürün Adı
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Adet
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Tutar
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Ödeme Tipi
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            İade Tarihi
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Geri Ödeme
                          </th>
                          <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                            Açıklama
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Tüm kayıtları birleştir ve tarihe göre sırala
                          const allRecords: Array<{
                            type: "debt" | "payment";
                            date: string;
                            debt?: Debt;
                            payment?: CustomerPayment;
                            item?: {
                              barcode?: string;
                              productName?: string;
                              quantity?: number;
                              price?: number;
                            };
                            isFirstItem?: boolean;
                            isRefunded?: boolean;
                            refundDate?: string;
                          }> = [];

                          // İade tarihi bulma fonksiyonu
                          const getRefundDate = (
                            debt: Debt,
                            item: {
                              barcode?: string;
                              productName?: string;
                              quantity?: number;
                              price?: number;
                            }
                          ) => {
                            const refundedItem = refunds.find((refund) => {
                              const refundDebtId =
                                typeof refund.debtId === "string"
                                  ? refund.debtId
                                  : refund.debtId._id;
                              return (
                                refundDebtId === debt._id &&
                                refund.barcode === item.barcode
                              );
                            });
                            return refundedItem?.refundDate;
                          };

                          // Borç kayıtlarını ekle (filtreye göre)
                          if (
                            filterType === "all" ||
                            filterType === "debts" ||
                            filterType === "refunds"
                          ) {
                            filteredData.debts.forEach((debt) => {
                              let items: Array<{
                                barcode?: string;
                                productName?: string;
                                quantity?: number;
                                price?: number;
                              }> = [];

                              // Önce yeni productDetails alanını kontrol et
                              if (
                                debt.productDetails &&
                                Array.isArray(debt.productDetails) &&
                                debt.productDetails.length > 0
                              ) {
                                items = debt.productDetails.map((detail) => ({
                                  barcode: detail.barcode,
                                  productName: detail.productName,
                                  quantity: detail.quantity,
                                  price: detail.unitPrice,
                                }));
                              } else if (
                                debt.saleId &&
                                typeof debt.saleId === "object" &&
                                debt.saleId.items &&
                                Array.isArray(debt.saleId.items)
                              ) {
                                items = debt.saleId.items;
                              } else if (
                                debt.saleId &&
                                typeof debt.saleId === "object" &&
                                debt.saleId.barcode
                              ) {
                                items = [
                                  {
                                    barcode: debt.saleId.barcode,
                                    productName: debt.saleId.productName || "-",
                                    quantity: debt.saleId.quantity || 1,
                                    price: debt.saleId.price || 0,
                                  },
                                ];
                              }

                              if (items.length > 0) {
                                items.forEach((item, index) => {
                                  // İade edilmiş ürünleri kontrol et
                                  const isRefunded = isProductRefunded(
                                    debt,
                                    item
                                  );

                                  // İadeler tabında sadece iade edilmiş ürünleri göster
                                  if (filterType === "refunds" && !isRefunded) {
                                    return;
                                  }

                                  // Borçlar tabında iade edilmiş ürünleri gösterme
                                  if (filterType === "debts" && isRefunded) {
                                    return;
                                  }

                                  allRecords.push({
                                    type: "debt",
                                    date: debt.createdAt,
                                    debt,
                                    item,
                                    isFirstItem: index === 0,
                                    isRefunded: isRefunded,
                                    refundDate: getRefundDate(debt, item),
                                  });
                                });
                              } else {
                                allRecords.push({
                                  type: "debt",
                                  date: debt.createdAt,
                                  debt,
                                  refundDate: getRefundDate(debt, {
                                    barcode: debt.saleId?.barcode,
                                  }),
                                });
                              }
                            });
                          }

                          // Ödeme kayıtlarını ekle (filtreye göre)
                          if (
                            filterType === "all" ||
                            filterType === "payments"
                          ) {
                            filteredData.payments
                              .filter((payment) => {
                                // "Geri Ödeme" açıklamalı satırları kaldır
                                return !payment.description
                                  ?.toLowerCase()
                                  .includes("geri ödeme");
                              })
                              .forEach((payment) => {
                                allRecords.push({
                                  type: "payment",
                                  date: payment.paymentDate,
                                  payment,
                                });
                              });
                          }

                          // Tarihe göre sırala (en yeni en üstte)
                          allRecords.sort(
                            (a, b) =>
                              new Date(b.date).getTime() -
                              new Date(a.date).getTime()
                          );

                          return allRecords.map((record, index) => {
                            if (record.type === "debt") {
                              const { debt, item, isFirstItem, isRefunded } =
                                record;

                              if (item) {
                                return (
                                  <tr
                                    key={`debt-${debt!._id}-${index}`}
                                    className={`hover:bg-red-50 dark:hover:bg-red-900/20 ${
                                      isRefunded
                                        ? "bg-gray-100 dark:bg-gray-800 opacity-60"
                                        : ""
                                    }`}
                                  >
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                      {isFirstItem &&
                                        format(
                                          parseISO(debt!.createdAt),
                                          "dd.MM.yy HH:mm",
                                          { locale: tr }
                                        )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      <div className="flex items-center gap-1">
                                        <span
                                          className={
                                            isRefunded
                                              ? "line-through text-gray-500"
                                              : ""
                                          }
                                        >
                                          {item.barcode || "-"}
                                        </span>
                                        {isRefunded && (
                                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1 rounded">
                                            İade
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      <div className="flex items-center gap-1">
                                        <span
                                          className={
                                            isRefunded
                                              ? "line-through text-gray-500"
                                              : ""
                                          }
                                        >
                                          {item.productName || "-"}
                                        </span>
                                        {isRefunded && (
                                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-1 rounded">
                                            İade
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      <span
                                        className={
                                          isRefunded
                                            ? "line-through text-gray-500"
                                            : ""
                                        }
                                      >
                                        {item.quantity || 1}
                                      </span>
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                                      {isRefunded ? (
                                        <span className="text-green-600">
                                          -
                                          {(() => {
                                            // İade edilen ürün için tutar hesapla
                                            const refundedItem = refunds.find(
                                              (refund) =>
                                                debt &&
                                                refund.debtId === debt._id &&
                                                refund.barcode === item.barcode
                                            );
                                            return refundedItem
                                              ? refundedItem.refundAmount.toFixed(
                                                  2
                                                )
                                              : (
                                                  (item.price || 0) *
                                                  (item.quantity || 1)
                                                ).toFixed(2);
                                          })()}{" "}
                                          ₺
                                        </span>
                                      ) : (
                                        <span>
                                          {(
                                            (item.price || 0) *
                                            (item.quantity || 1)
                                          ).toFixed(2)}{" "}
                                          ₺
                                        </span>
                                      )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      {record.refundDate ? (
                                        <span className="text-green-600">
                                          {format(
                                            parseISO(record.refundDate),
                                            "dd.MM.yy HH:mm",
                                            { locale: tr }
                                          )}
                                        </span>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleEditDesc(debt!)}
                                          className="text-gray-400 hover:text-blue-500 p-0.5"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        {editingDescId === debt!._id ? (
                                          <>
                                            <textarea
                                              className="px-1 py-0.5 rounded border border-gray-400 text-xs bg-gray-900 text-white w-96 resize"
                                              value={descDraft}
                                              onChange={(e) =>
                                                setDescDraft(e.target.value)
                                              }
                                              rows={2}
                                              autoFocus
                                            />
                                            <button
                                              onClick={() =>
                                                handleSaveDesc(debt!)
                                              }
                                              className="text-green-500 hover:text-green-700 text-xs"
                                            >
                                              ✔
                                            </button>
                                            <button
                                              onClick={handleCancelDesc}
                                              className="text-red-500 hover:text-red-700 text-xs"
                                            >
                                              ✖
                                            </button>
                                          </>
                                        ) : (
                                          <span>
                                            {isFirstItem
                                              ? debt!.description || ""
                                              : ""}
                                          </span>
                                        )}
                                      </div>

                                      {/* İade Butonu - Sabit Pozisyon */}
                                      <div className="mt-2 flex justify-end">
                                        <button
                                          onClick={() =>
                                            handleRefund(debt!, item, index)
                                          }
                                          disabled={
                                            refundLoading ===
                                              `${debt!._id}-${index}` ||
                                            isRefunded
                                          }
                                          className={`px-3 py-1 text-xs rounded transition-colors ${
                                            isRefunded
                                              ? "bg-green-400 text-white cursor-not-allowed"
                                              : refundLoading ===
                                                `${debt!._id}-${index}`
                                              ? "bg-gray-400 cursor-not-allowed"
                                              : "bg-red-500 hover:bg-red-600 text-white"
                                          }`}
                                        >
                                          {isRefunded
                                            ? "İade Edildi"
                                            : refundLoading ===
                                              `${debt!._id}-${index}`
                                            ? "İşleniyor..."
                                            : "İade Et"}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              } else {
                                return (
                                  <tr
                                    key={debt!._id}
                                    className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                      {format(
                                        parseISO(debt!.createdAt),
                                        "dd.MM.yy HH:mm",
                                        { locale: tr }
                                      )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                                      {(
                                        debt!.remainingAmount ||
                                        debt!.amount ||
                                        0
                                      ).toFixed(2)}{" "}
                                      ₺
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleEditDesc(debt!)}
                                          className="text-gray-400 hover:text-blue-500 p-0.5"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        {editingDescId === debt!._id ? (
                                          <>
                                            <textarea
                                              className="px-1 py-0.5 rounded border border-gray-400 text-xs bg-gray-900 text-white w-96 resize"
                                              value={descDraft}
                                              onChange={(e) =>
                                                setDescDraft(e.target.value)
                                              }
                                              rows={2}
                                              autoFocus
                                            />
                                            <button
                                              onClick={() =>
                                                handleSaveDesc(debt!)
                                              }
                                              className="text-green-500 hover:text-green-700 text-xs"
                                            >
                                              ✔
                                            </button>
                                            <button
                                              onClick={handleCancelDesc}
                                              className="text-red-500 hover:text-red-700 text-xs"
                                            >
                                              ✖
                                            </button>
                                          </>
                                        ) : (
                                          <span>{debt!.description || ""}</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                            } else {
                              const { payment } = record;

                              // Eğer negatif ödeme ise (geri ödeme), ayrı satır olarak render et
                              if (payment!.amount < 0) {
                                return (
                                  <tr
                                    key={`refund-${payment!._id}`}
                                    className="hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                  >
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                      {format(
                                        parseISO(payment!.paymentDate),
                                        "dd.MM.yy HH:mm",
                                        { locale: tr }
                                      )}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                                      {payment!.amount.toFixed(2)} ₺
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      Geri Ödeme
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      -
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-yellow-600 font-semibold">
                                      {Math.abs(payment!.amount).toFixed(2)} ₺
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() =>
                                            handleEditPaymentDesc(payment!)
                                          }
                                          className="text-gray-400 hover:text-blue-500 p-0.5"
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <Pencil size={16} />
                                        </button>
                                        {editingPaymentId === payment!._id ? (
                                          <>
                                            <textarea
                                              className="px-1 py-0.5 rounded border border-gray-400 text-xs bg-gray-900 text-white w-96 resize"
                                              value={paymentDescDraft}
                                              onChange={(e) =>
                                                setPaymentDescDraft(
                                                  e.target.value
                                                )
                                              }
                                              rows={2}
                                              autoFocus
                                            />
                                            <button
                                              onClick={() =>
                                                handleSavePaymentDesc(payment!)
                                              }
                                              className="text-green-500 hover:text-green-700 text-xs"
                                            >
                                              ✔
                                            </button>
                                            <button
                                              onClick={handleCancelPaymentDesc}
                                              className="text-red-500 hover:text-red-700 text-xs"
                                            >
                                              ✖
                                            </button>
                                          </>
                                        ) : (
                                          <span>
                                            {payment!.description ||
                                              "Geri Ödeme"}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              // Normal pozitif ödemeler için mevcut kod
                              return (
                                <tr
                                  key={`payment-${payment!._id}`}
                                  className="hover:bg-green-50 dark:hover:bg-green-900/20"
                                >
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                    {format(
                                      parseISO(payment!.paymentDate),
                                      "dd.MM.yy HH:mm",
                                      { locale: tr }
                                    )}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-semibold">
                                    {payment!.amount.toFixed(2)} ₺
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {payment!.paymentType === "nakit"
                                      ? "Nakit"
                                      : payment!.paymentType === "kredi_karti"
                                      ? "Kredi Kartı"
                                      : payment!.paymentType === "havale"
                                      ? "Havale"
                                      : payment!.paymentType === "cek"
                                      ? "Çek"
                                      : payment!.paymentType === "diger"
                                      ? "Diğer"
                                      : payment!.paymentType}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() =>
                                          handleEditPaymentDesc(payment!)
                                        }
                                        className="text-gray-400 hover:text-blue-500 p-0.5"
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                        }}
                                      >
                                        <Pencil size={16} />
                                      </button>
                                      {editingPaymentId === payment!._id ? (
                                        <>
                                          <textarea
                                            className="px-1 py-0.5 rounded border border-gray-400 text-xs bg-gray-900 text-white w-96 resize"
                                            value={paymentDescDraft}
                                            onChange={(e) =>
                                              setPaymentDescDraft(
                                                e.target.value
                                              )
                                            }
                                            rows={2}
                                            autoFocus
                                          />
                                          <button
                                            onClick={() =>
                                              handleSavePaymentDesc(payment!)
                                            }
                                            className="text-green-500 hover:text-green-700 text-xs"
                                          >
                                            ✔
                                          </button>
                                          <button
                                            onClick={handleCancelPaymentDesc}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                          >
                                            ✖
                                          </button>
                                        </>
                                      ) : (
                                        <span>
                                          {payment!.description || "Ödeme"}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Sadece ödeme detayları (type === "payment" için)
            <div>
              {/* Filtre Butonları */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => handleFilterChange("all")}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Tümü ({tabCounts.all})
                </button>
                <button
                  onClick={() => handleFilterChange("payments")}
                  disabled={loading}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    filterType === "payments"
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Ödemeler ({tabCounts.payments})
                </button>
              </div>

              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  {filterType === "all" && "Tüm Ödeme Kayıtları"}
                  {filterType === "payments" && "Ödeme Kayıtları"}
                </h4>
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Veriler yükleniyor...
                    </span>
                  </div>
                ) : filteredData.payments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    Ödeme kaydı bulunamadı.
                  </p>
                ) : (
                  <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Tarih
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Tutar
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Ödeme Tipi
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Açıklama
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.payments
                        .filter((payment) => {
                          if (filterType === "all") return true;
                          if (filterType === "payments") return true;
                          return false;
                        })
                        .filter((payment) => {
                          // "Geri Ödeme" açıklamalı satırları kaldır
                          return !payment.description
                            ?.toLowerCase()
                            .includes("geri ödeme");
                        })
                        .map((payment) => (
                          <tr
                            key={payment._id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                              {format(
                                parseISO(payment.paymentDate),
                                "dd.MM.yy HH:mm",
                                { locale: tr }
                              )}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-semibold">
                              {payment.amount.toFixed(2)} ₺
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                              {payment.paymentType === "nakit"
                                ? "Nakit"
                                : payment.paymentType === "kredi_karti"
                                ? "Kredi Kartı"
                                : payment.paymentType === "havale"
                                ? "Havale"
                                : payment.paymentType === "cek"
                                ? "Çek"
                                : payment.paymentType === "diger"
                                ? "Diğer"
                                : payment.paymentType}
                            </td>
                            <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditPaymentDesc(payment)}
                                  className="text-gray-400 hover:text-blue-500 p-0.5"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Pencil size={16} />
                                </button>
                                {editingPaymentId === payment._id ? (
                                  <>
                                    <textarea
                                      className="px-1 py-0.5 rounded border border-gray-400 text-xs bg-gray-900 text-white w-96 resize"
                                      value={paymentDescDraft}
                                      onChange={(e) =>
                                        setPaymentDescDraft(e.target.value)
                                      }
                                      rows={2}
                                      autoFocus
                                    />
                                    <button
                                      onClick={() =>
                                        handleSavePaymentDesc(payment)
                                      }
                                      className="text-green-500 hover:text-green-700 text-xs"
                                    >
                                      ✔
                                    </button>
                                    <button
                                      onClick={handleCancelPaymentDesc}
                                      className="text-red-500 hover:text-red-700 text-xs"
                                    >
                                      ✖
                                    </button>
                                  </>
                                ) : (
                                  <span>{payment.description || "-"}</span>
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
          )}
        </div>
      </div>
      {showRefundConfirm && pendingRefund && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70 p-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              İade Onayı
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              <strong>{pendingRefund.debt.description || "Bu borç"}</strong>
              <span>
                {" "}
                üzerinden{" "}
                <strong>
                  {pendingRefund.productDetail.productName ||
                    pendingRefund.productDetail.barcode}
                </strong>
              </span>
              <span>
                {" "}
                adet{" "}
                <strong>{pendingRefund.productDetail.quantity || 1}</strong>
              </span>
              <span>
                {" "}
                tutarı{" "}
                <strong>
                  {(
                    (pendingRefund.productDetail.price || 0) *
                    (pendingRefund.productDetail.quantity || 1)
                  ).toFixed(2)}{" "}
                  ₺
                </strong>
              </span>
              <span> iade edilecektir.</span>
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={confirmRefund}
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none"
                disabled={
                  refundLoading ===
                  `${pendingRefund.debt._id}-${pendingRefund.index}`
                }
              >
                {refundLoading ===
                `${pendingRefund.debt._id}-${pendingRefund.index}`
                  ? "İşleniyor..."
                  : "İade Et"}
              </button>
              <button
                onClick={cancelRefund}
                className="px-4 py-2 text-sm rounded-md bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Geri Ödeme Modal */}
      {showCustomerRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70 p-0">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Müşteri Geri Ödeme
              </h3>
              <button
                onClick={() => setShowCustomerRefundModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>{customerName}</strong> müşterisine yapılacak geri ödeme
                tutarını girin.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Toplam Ödeme:
                    </span>
                    <span className="ml-2 font-semibold text-green-600">
                      {calculations.totalPayments.toFixed(2)} ₺
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      İade Edilen:
                    </span>
                    <span className="ml-2 font-semibold text-orange-600">
                      {calculations.totalRefunded.toFixed(2)} ₺
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Toplam Satış:
                    </span>
                    <span className="ml-2 font-semibold text-blue-600">
                      {calculations.totalDebt.toFixed(2)} ₺
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Hesaplanan Geri Ödeme:
                    </span>
                    <span className="ml-2 font-semibold text-yellow-600">
                      {calculations.excessPayment.toFixed(2)} ₺
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Geri Ödeme Tutarı (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customerRefundAmount}
                  onChange={(e) => setCustomerRefundAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCustomerRefundModal(false)}
                className="px-4 py-2 text-sm rounded-md bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-400 dark:hover:bg-gray-600 focus:outline-none"
              >
                İptal
              </button>
              <button
                onClick={() => {
                  const amount = parseFloat(customerRefundAmount);
                  if (amount > 0) {
                    handleSubCustomerRefund(amount);
                    setShowCustomerRefundModal(false);
                  } else {
                    onNotification?.(
                      "Lütfen geçerli bir tutar girin.",
                      "warning"
                    );
                  }
                }}
                className="px-4 py-2 text-sm rounded-md bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none"
              >
                Geri Ödeme Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtDetailsModal;
