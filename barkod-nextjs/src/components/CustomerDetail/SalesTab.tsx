import React, { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface SaleItem {
  _id: string;
  saleId:
    | string
    | {
        _id: string;
        items?: Array<{
          barcode: string;
          productName: string;
          quantity: number;
        }>;
        barcode?: string;
      };
  productId: string;
  barcode: string;
  productName: string;
  quantity: number;
  originalPrice: number;
  customPrice?: number;
  finalPrice: number;
  totalAmount: number;
  customerId: string;
  subCustomerId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SalesTabProps {
  saleItems: SaleItem[];
  customerId?: string;
  subCustomerId?: string;
}

const SalesTab: React.FC<SalesTabProps> = ({
  saleItems,
  customerId,
  subCustomerId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredItems, setFilteredItems] = useState<SaleItem[]>(saleItems);
  const [loading, setLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState<string | null>(null);
  const [refundedItems, setRefundedItems] = useState<Set<string>>(new Set());
  const [showConfirmModal, setShowConfirmModal] = useState<{
    isOpen: boolean;
    item: SaleItem | null;
  }>({ isOpen: false, item: null });
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Arama değiştiğinde backend'den veri çek
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchFilteredSales(term, startDate, endDate);
    }, 300);
  };

  // Tarih değiştiğinde backend'den veri çek
  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      fetchFilteredSales(
        searchTerm,
        type === "start" ? value : startDate,
        type === "end" ? value : endDate
      );
    }, 300);
  };

  const fetchFilteredSales = async (
    search?: string,
    start?: string,
    end?: string
  ) => {
    if (!customerId) return;

    setLoading(true);
    try {
      let url = `/api/sale-items/customer/${customerId}`;
      const params = new URLSearchParams();

      if (subCustomerId) params.append("subCustomerId", subCustomerId);
      if (search) params.append("search", search);
      if (start) params.append("startDate", start);
      if (end) params.append("endDate", end);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFilteredItems(data.saleItems || []);
      }
    } catch (error) {
      console.error("Satış verileri çekme hatası:", error);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
    setFilteredItems(saleItems);
  };

  // İlk yüklemede tüm verileri göster
  React.useEffect(() => {
    setFilteredItems(saleItems);
  }, [saleItems]);

  // İade onay modalını aç
  const handleRefundClick = (item: SaleItem) => {
    setShowConfirmModal({ isOpen: true, item });
  };

  // İade işlemi
  const handleRefund = async (item: SaleItem) => {
    setRefundLoading(item._id);
    try {
      const { refundService } = await import("../../services/refundService");

      await refundService.processRefund({
        productId: item.productId,
        quantity: item.quantity,
        customerId: customerId!,
        refundAmount: item.finalPrice * item.quantity,
        isPaid: false, // Satışlar tabında genelde ödenmemiş
        subCustomerId: subCustomerId,
      });

      // İade edilen ürünü listeye ekle
      setRefundedItems((prev) => new Set(prev).add(item._id));
      alert("İade işlemi başarıyla tamamlandı!");
    } catch (error) {
      console.error("İade işlemi hatası:", error);
      alert(
        error instanceof Error
          ? error.message
          : "İade işlemi sırasında bir hata oluştu."
      );
    } finally {
      setRefundLoading(null);
      setShowConfirmModal({ isOpen: false, item: null });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 flex-shrink-0">
        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
          Satışlar
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Başlangıç"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange("end", e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Bitiş"
            />
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Ürün kodu veya adı ile ara..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[250px]"
            />
            {(searchTerm || startDate || endDate) && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Tarih
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Ürün Kodu
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Adet
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Malzeme
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Tutar
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    Aranıyor...
                  </div>
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  Satış yok
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item._id}
                  className={`border-b border-gray-100 dark:border-gray-700 ${
                    refundedItems.has(item._id)
                      ? "bg-gray-200 dark:bg-gray-700"
                      : ""
                  }`}
                >
                  <td className="py-2 text-xs text-gray-400">
                    {format(parseISO(item.createdAt), "dd MMM yyyy HH:mm", {
                      locale: tr,
                    })}
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-300 font-mono text-xs">
                    {item.barcode || "-"}
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-300">
                    {item.quantity || 0}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-white">
                    {item.productName || "Bilinmiyor"}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-white">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">
                        {item.finalPrice?.toFixed(2)} ₺
                      </span>
                      {item.customPrice &&
                        item.customPrice !== item.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {item.originalPrice?.toFixed(2)} ₺
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => handleRefundClick(item)}
                      disabled={
                        refundLoading === item._id ||
                        refundedItems.has(item._id)
                      }
                      className={`px-3 py-1 text-white text-xs rounded transition-colors ${
                        refundedItems.has(item._id)
                          ? "bg-gray-400 cursor-not-allowed"
                          : refundLoading === item._id
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {refundedItems.has(item._id)
                        ? "İade Edildi"
                        : refundLoading === item._id
                        ? "İşleniyor..."
                        : "İade Et"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* İade Onay Modalı */}
      {showConfirmModal.isOpen && showConfirmModal.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              İade Onayı
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              <strong>{showConfirmModal.item.productName}</strong> ürününü iade
              etmek istediğinizden emin misiniz?
              <br />
              <span className="text-sm text-gray-500">
                Tutar:{" "}
                {showConfirmModal.item.finalPrice *
                  showConfirmModal.item.quantity}{" "}
                ₺
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() =>
                  setShowConfirmModal({ isOpen: false, item: null })
                }
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleRefund(showConfirmModal.item!)}
                disabled={refundLoading === showConfirmModal.item!._id}
                className={`px-4 py-2 rounded transition-colors ${
                  refundLoading === showConfirmModal.item!._id
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {refundLoading === showConfirmModal.item!._id
                  ? "İşleniyor..."
                  : "Evet, İade Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTab;
