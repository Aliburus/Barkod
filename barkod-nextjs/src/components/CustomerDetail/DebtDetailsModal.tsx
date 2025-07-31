import React, { useState, useRef } from "react";
import { Debt, CustomerPayment } from "../../types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { Pencil } from "lucide-react";

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string;
  debts: Debt[];
  payments: CustomerPayment[];
  type: "debt" | "payment";
  subCustomerId?: string; // <-- eklendi
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
}) => {
  const [filterType, setFilterType] = useState<"all" | "debts" | "payments">(
    "all"
  );
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExtraFilter, setSelectedExtraFilter] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const productTimeout = useRef<NodeJS.Timeout | null>(null);

  // Filter değiştiğinde backend'den veri çek
  const fetchFilteredData = async (
    newFilterType: "all" | "debts" | "payments",
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
      fetchFilteredData("all");
    }
  }, [isOpen]);

  // Filter değiştiğinde veri çek
  const handleFilterChange = (newFilterType: "all" | "debts" | "payments") => {
    setFilterType(newFilterType);
    fetchFilteredData(newFilterType);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-0">
      <div className="bg-white dark:bg-gray-900 rounded-none shadow-xl w-full h-auto max-w-none max-h-none">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
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
        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-wrap gap-6 bg-gray-800/60 dark:bg-gray-800/60 rounded-lg p-4 border border-gray-700">
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Toplam Borç:</span>
              <span className="ml-2 font-semibold text-red-500">
                {filteredData.totalDebt.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Toplam Ödeme:</span>
              <span className="ml-2 font-semibold text-green-500">
                {filteredData.totalPaid.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex-1 min-w-[120px]">
              <span className="text-gray-300">Kalan:</span>
              <span className="ml-2 font-semibold text-orange-400">
                {filteredData.remainingDebt.toFixed(2)} ₺
              </span>
            </div>
          </div>
        </div>
        <div className="p-6">
          {type === "debt" ? (
            // Borç ve ödeme detayları
            <div>
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
                  Tümü (
                  {filteredData.debts.length + filteredData.payments.length})
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
                  Borçlar ({filteredData.debts.length})
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
                  Ödemeler ({filteredData.payments.length})
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

              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  {filterType === "all" && "Tüm İşlem Detayları"}
                  {filterType === "debts" && "Borç Detayları"}
                  {filterType === "payments" && "Ödeme Detayları"}
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
                  <div className="max-h-[400px] overflow-y-auto">
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
                          }> = [];

                          // Borç kayıtlarını ekle (filtreye göre)
                          if (filterType === "all" || filterType === "debts") {
                            filteredData.debts.forEach((debt) => {
                              let items: Array<{
                                barcode?: string;
                                productName?: string;
                                quantity?: number;
                                price?: number;
                              }> = [];

                              // Önce yeni productDetails alanını kontrol et
                              if (debt.productDetails && Array.isArray(debt.productDetails) && debt.productDetails.length > 0) {
                                items = debt.productDetails.map(detail => ({
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
                                  allRecords.push({
                                    type: "debt",
                                    date: debt.createdAt,
                                    debt,
                                    item,
                                    isFirstItem: index === 0,
                                  });
                                });
                              } else {
                                allRecords.push({
                                  type: "debt",
                                  date: debt.createdAt,
                                  debt,
                                });
                              }
                            });
                          }

                          // Ödeme kayıtlarını ekle (filtreye göre)
                          if (
                            filterType === "all" ||
                            filterType === "payments"
                          ) {
                            filteredData.payments.forEach((payment) => {
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
                              const { debt, item, isFirstItem } = record;

                              if (item) {
                                return (
                                  <tr
                                    key={`debt-${debt!._id}-${index}`}
                                    className="hover:bg-red-50 dark:hover:bg-red-900/20"
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
                                      {item.barcode || "-"}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      {item.productName || "-"}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                      {item.quantity || 1}
                                    </td>
                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                                      {(
                                        (item.price || 0) * (item.quantity || 1)
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
                                          <span>
                                            {isFirstItem
                                              ? debt!.description || ""
                                              : ""}
                                          </span>
                                        )}
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
                                      {debt!.amount.toFixed(2)} ₺
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
                                    {payment!.description || "-"}
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
                  Tümü ({filteredData.payments.length})
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
                  Ödemeler ({filteredData.payments.length})
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
                              {payment.description || "-"}
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
    </div>
  );
};

export default DebtDetailsModal;
