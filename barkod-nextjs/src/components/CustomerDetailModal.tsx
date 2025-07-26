import React, { useState } from "react";
import { Customer, Sale, Debt, SaleItem } from "../types";
import { customerService } from "../services/customerService";
import { productService } from "../services/productService";
import { debtService } from "../services/debtService";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

const CustomerDetailModal = ({
  open,
  onClose,
  customer,
  fetchCustomers,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  fetchCustomers?: () => void;
}) => {
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [trxForm, setTrxForm] = React.useState({
    amount: "",
    description: "",
    paymentType: "nakit",
  });
  const [trxLoading, setTrxLoading] = React.useState(false);
  const [sales, setSales] = React.useState<Sale[]>([]);

  // Kalan Borç detay popup state
  const [showBorcDetail, setShowBorcDetail] = useState(false);
  const [showOdemeDetail, setShowOdemeDetail] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [debtDetailOpen, setDebtDetailOpen] = useState(false);

  // Sıralama state'leri
  const [transactionSort, setTransactionSort] = React.useState<
    "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  >("date_desc");
  const [salesSort, setSalesSort] = React.useState<
    "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  >("date_desc");

  // Tarih aralığı state'leri
  const [transactionStartDate, setTransactionStartDate] =
    React.useState<string>("");
  const [transactionEndDate, setTransactionEndDate] =
    React.useState<string>("");
  const [salesStartDate, setSalesStartDate] = React.useState<string>("");
  const [salesEndDate, setSalesEndDate] = React.useState<string>("");

  React.useEffect(() => {
    if (customer) {
      setTrxForm({
        amount: "",
        description: "",
        paymentType: "nakit",
      });
      setTrxLoading(true);

      // Borç bilgilerini getir
      debtService
        .getByCustomerId(customer.id)
        .then((data) => {
          // createdAt ve updatedAt alanlarını stringe çevir
          setDebts(
            data.debts.map((d) => ({
              ...d,
              createdAt: d.createdAt?.toString() ?? "",
              updatedAt: d.updatedAt?.toString() ?? undefined,
              dueDate: d.dueDate?.toString() ?? undefined,
            })) as Debt[]
          );
          setTrxLoading(false);
        })
        .catch((error) => {
          console.error("Borç bilgileri getirilemedi:", error);
          setTrxLoading(false);
        });

      productService.getAllSales().then((allSales) => {
        setSales(
          allSales
            .filter(
              (s: Sale) =>
                s.customer === customer.id || s.customerId === customer.id
            )
            .map((s: Sale) => ({
              ...s,
              createdAt: s.createdAt?.toString() ?? undefined,
              soldAt: s.soldAt?.toString() ?? "",
            }))
        );
      });
    }
  }, [customer]);

  if (!open || !customer) return null;

  // Borç sistemi hesaplaması
  const totalDebtAmount = debts.reduce(
    (sum, debt) => sum + (debt.amount ?? 0),
    0
  );
  const totalPaidAmount = debts.reduce(
    (sum, debt) => sum + (debt.paidAmount || 0),
    0
  );
  const remainingDebt = totalDebtAmount - totalPaidAmount;

  const handleTrxChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setTrxForm({ ...trxForm, [e.target.name]: e.target.value });
  };

  const handleTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !trxForm.amount.trim()) return;

    try {
      // Ödeme kaydı oluştur
      const paymentData = {
        customerId: customer.id,
        amount: parseFloat(trxForm.amount),
        paymentType: trxForm.paymentType,
        description: trxForm.description || "Ödeme",
        date: new Date().toISOString(),
      };

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentData),
      });

      if (response.ok) {
        setTrxForm({
          amount: "",
          description: "",
          paymentType: "nakit",
        });

        // Borç listesini yenile
        const newDebts = await debtService.getByCustomerId(customer.id);
        // createdAt alanını string'e çevirerek tip hatasını düzelt
        setDebts(
          newDebts.debts.map((debt) => ({
            ...debt,
            createdAt:
              typeof debt.createdAt === "string"
                ? debt.createdAt
                : debt.createdAt?.toISOString() ?? "",
            updatedAt: debt.updatedAt?.toString() ?? undefined,
            dueDate: debt.dueDate?.toString() ?? undefined,
          })) as Debt[]
        );
        if (fetchCustomers) fetchCustomers();
      } else {
        console.error("Ödeme kaydedilemedi");
      }
    } catch (error) {
      console.error("Ödeme işlemi hatası:", error);
    }
  };

  const handleColorChange = async (customerId: string, color: string) => {
    await customerService.update(customerId, { color });
    if (fetchCustomers) fetchCustomers();
    // Anlık olarak müşteri objesinin rengini güncelle
    if (customer && customer.id === customerId) {
      customer.color = color;
      setTrxForm((f) => ({ ...f })); // re-render tetikle
    }
  };

  const handleDebtClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setDebtDetailOpen(true);
  };

  // Sıralama fonksiyonları
  const sortedDebts = [...debts].sort((a, b) => {
    if (transactionSort === "date_desc")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (transactionSort === "date_asc")
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (transactionSort === "amount_desc") return b.amount - a.amount;
    if (transactionSort === "amount_asc") return a.amount - b.amount;
    return 0;
  });
  const sortedSales = [...sales].sort((a, b) => {
    if (salesSort === "date_desc")
      return new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime();
    if (salesSort === "date_asc")
      return new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime();
    if (salesSort === "amount_desc")
      return (b.totalAmount || 0) - (a.totalAmount || 0);
    if (salesSort === "amount_asc")
      return (a.totalAmount || 0) - (b.totalAmount || 0);
    return 0;
  });

  // Tarih aralığı filtreleme fonksiyonları
  const filteredDebts = sortedDebts.filter((t) => {
    if (!transactionStartDate && !transactionEndDate) return true;
    const transactionDate = new Date(t.createdAt);
    if (
      transactionStartDate &&
      transactionDate < new Date(transactionStartDate)
    )
      return false;
    if (
      transactionEndDate &&
      transactionDate > new Date(transactionEndDate + "T23:59:59")
    )
      return false;
    return true;
  });
  const filteredSales = sortedSales.filter((s) => {
    if (!salesStartDate && !salesEndDate) return true;
    const saleDate = new Date(s.soldAt);
    if (salesStartDate && saleDate < new Date(salesStartDate)) return false;
    if (salesEndDate && saleDate > new Date(salesEndDate + "T23:59:59"))
      return false;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-2">
      <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-[96vw] min-h-[60vh] max-h-[92vh] flex flex-col p-0 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl z-10"
        >
          ×
        </button>
        {/* Üst başlık ve özet */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-8 pt-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 min-w-0">
            {/* Müşteri renk badge'i */}
            <span
              className={`inline-block w-6 h-6 rounded-full border-2 border-gray-300 transition-all duration-200 ${
                customer.color === "yellow"
                  ? "bg-yellow-400"
                  : customer.color === "red"
                  ? "bg-red-500"
                  : customer.color === "blue"
                  ? "bg-blue-500"
                  : "bg-gray-200"
              }`}
            ></span>
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {customer.name}
                </span>
                {/* Renk seçme butonları */}
                <span className="flex items-center gap-2 ml-2">
                  {["yellow", "red", "blue"].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(customer.id, color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center focus:outline-none ${
                        color === "yellow"
                          ? "bg-yellow-400 border-yellow-600"
                          : color === "red"
                          ? "bg-red-400 border-red-600"
                          : "bg-blue-400 border-blue-600"
                      } ${
                        customer.color === color
                          ? "ring-2 ring-blue-500 scale-110 shadow-lg"
                          : "hover:scale-110 opacity-80"
                      }`}
                      style={{
                        boxShadow:
                          customer.color === color
                            ? "0 0 0 2px #fff"
                            : undefined,
                      }}
                      title={color}
                    />
                  ))}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-300 truncate">
                {customer.phone || "-"} • {customer.address || "-"}
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-8 flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Toplam Borç
              </span>
              <span className="font-bold text-lg text-red-500">
                {totalDebtAmount.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Toplam Ödeme
              </span>
              <span
                className="font-bold text-lg text-green-500 cursor-pointer underline decoration-dotted hover:decoration-solid"
                onClick={() => setShowOdemeDetail(true)}
                title="Ödeme detaylarını gör"
              >
                {totalPaidAmount.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Kalan Borç
              </span>
              <span
                className="font-bold text-lg text-orange-500 cursor-pointer underline decoration-dotted hover:decoration-solid"
                onClick={() => setShowBorcDetail(true)}
                title="Kalan borç detaylarını gör"
              >
                {remainingDebt.toFixed(2)} ₺
              </span>
            </div>
          </div>
        </div>
        {/* Ödeme Alma Alanı */}
        <div className="w-full px-8 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Ödeme Al
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Müşteriden ödeme almak için aşağıdaki formu kullanın. Ödeme
              yapıldığında borç geçmişinde ödeme olarak görünecektir.
            </p>
          </div>
          <form
            onSubmit={handleTrxSubmit}
            className="flex flex-col md:flex-row w-full gap-3"
          >
            <input
              name="amount"
              value={trxForm.amount}
              onChange={handleTrxChange}
              placeholder="Ödeme Tutarı"
              type="number"
              min="0"
              step="0.01"
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              required
            />

            <select
              name="paymentType"
              value={trxForm.paymentType}
              onChange={handleTrxChange}
              className="w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="nakit">Nakit</option>
              <option value="havale">Havale</option>
              <option value="kredi kartı">Kredi Kartı</option>
              <option value="diğer">Diğer</option>
            </select>
            <input
              name="description"
              value={trxForm.description}
              onChange={handleTrxChange}
              placeholder="Ödeme açıklaması (isteğe bağlı)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <button
              type="submit"
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm"
              disabled={trxLoading}
            >
              {trxLoading ? "Kaydediliyor..." : "Ödeme Al"}
            </button>
          </form>
        </div>
        {/* Alt ana içerik */}
        <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-8 px-4 md:px-8 pb-8 pt-4 overflow-hidden">
          {/* Hareket Geçmişi */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-700 pr-0 md:pr-8">
            {/* Hareket Geçmişi başlığı ve filtre-sıralama alanı */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
                Borç Geçmişi
              </div>
              <div className="flex flex-1 flex-col md:flex-row md:items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={transactionStartDate}
                    onChange={(e) => setTransactionStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Başlangıç"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={transactionEndDate}
                    onChange={(e) => setTransactionEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Bitiş"
                  />
                  <button
                    onClick={() => {
                      setTransactionStartDate("");
                      setTransactionEndDate("");
                    }}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Temizle
                  </button>
                </div>
                <select
                  value={transactionSort}
                  onChange={(e) =>
                    setTransactionSort(
                      e.target.value as
                        | "date_desc"
                        | "date_asc"
                        | "amount_desc"
                        | "amount_asc"
                    )
                  }
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="date_desc">Tarih (Yeni &gt; Eski)</option>
                  <option value="date_asc">Tarih (Eski &gt; Yeni)</option>
                  <option value="amount_desc">Tutar (Büyük &gt; Küçük)</option>
                  <option value="amount_asc">Tutar (Küçük &gt; Büyük)</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Durum
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Tutar
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Açıklama
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center text-gray-400 py-6"
                      >
                        Borç kaydı yok
                      </td>
                    </tr>
                  ) : (
                    filteredDebts.map((t) => (
                      <tr
                        key={t._id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => handleDebtClick(t)}
                      >
                        <td
                          className={`font-semibold ${
                            t.isPaid ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {t.isPaid ? "Ödendi" : "Borçlu"}
                        </td>
                        <td className="text-gray-900 dark:text-white">
                          {t.amount.toFixed(2)} ₺
                        </td>
                        <td className="text-gray-500 dark:text-gray-300 max-w-[180px] truncate">
                          {t.description || "-"}
                        </td>
                        <td className="text-xs text-gray-400">
                          {format(parseISO(t.createdAt), "dd MMM yyyy HH:mm", {
                            locale: tr,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Satış Geçmişi */}
          <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-8">
            {/* Satış Geçmişi başlığı ve filtre-sıralama alanı */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-2">
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
                Satış Geçmişi
              </div>
              <div className="flex flex-1 flex-col md:flex-row md:items-center gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => setSalesStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Başlangıç"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => setSalesEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Bitiş"
                  />
                  <button
                    onClick={() => {
                      setSalesStartDate("");
                      setSalesEndDate("");
                    }}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Temizle
                  </button>
                </div>
                <select
                  value={salesSort}
                  onChange={(e) =>
                    setSalesSort(
                      e.target.value as
                        | "date_desc"
                        | "date_asc"
                        | "amount_desc"
                        | "amount_asc"
                    )
                  }
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="date_desc">Tarih (Yeni &gt; Eski)</option>
                  <option value="date_asc">Tarih (Eski &gt; Yeni)</option>
                  <option value="amount_desc">Tutar (Büyük &gt; Küçük)</option>
                  <option value="amount_asc">Tutar (Küçük &gt; Büyük)</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Ürün
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Adet
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Birim Fiyat
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Toplam
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Ödeme
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                      Tarih
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center text-gray-400 py-6"
                      >
                        Satış yok
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s) => {
                      // Eğer items array'i varsa (sepet satışı)
                      if (s.items && s.items.length > 0) {
                        return s.items.map((item: SaleItem, index: number) => (
                          <tr
                            key={`${s._id}-${index}`}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <td className="font-semibold text-gray-900 dark:text-white max-w-[180px] truncate">
                              {item.productName}
                            </td>
                            <td className="text-gray-500 dark:text-gray-300">
                              {item.quantity} adet
                            </td>
                            <td className="text-gray-500 dark:text-gray-300">
                              {item.price?.toFixed(2) || "0.00"} ₺
                            </td>
                            <td className="font-semibold text-gray-900 dark:text-white">
                              {((item.price || 0) * item.quantity).toFixed(2)} ₺
                            </td>
                            <td className="text-gray-500 dark:text-gray-300">
                              {s.paymentType || "-"}
                            </td>
                            <td className="text-xs text-gray-400">
                              {format(
                                parseISO(s.createdAt || s.soldAt),
                                "dd MMM yyyy HH:mm",
                                {
                                  locale: tr,
                                }
                              )}
                            </td>
                          </tr>
                        ));
                      } else {
                        // Eski format (tek ürün satışı)
                        return (
                          <tr
                            key={s._id}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <td className="font-semibold text-gray-900 dark:text-white max-w-[180px] truncate">
                              {(s as { productName?: string }).productName ||
                                "-"}
                            </td>
                            <td className="text-gray-500 dark:text-gray-300">
                              {(s as { quantity?: number }).quantity || 0} adet
                            </td>
                            <td className="text-gray-500 dark:text-gray-300">
                              {(s as { price?: number }).price?.toFixed(2) ||
                                "0.00"}{" "}
                              ₺
                            </td>
                            <td className="font-semibold text-gray-900 dark:text-white">
                              {(
                                ((s as { price?: number }).price || 0) *
                                ((s as { quantity?: number }).quantity || 0)
                              ).toFixed(2)}{" "}
                              ₺
                            </td>
                            <td className="text-gray-500 dark:text-gray-300">
                              {s.paymentType || "-"}
                            </td>
                            <td className="text-xs text-gray-400">
                              {format(parseISO(s.soldAt), "dd MMM yyyy HH:mm", {
                                locale: tr,
                              })}
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
        </div>
        {/* Kalan Borç Detay Modalı */}
        {showBorcDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowBorcDetail(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Kapat
              </button>
              <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Kalan Borç Detayı
              </h4>
              {debts.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Borç kaydı yok.
                </p>
              ) : (
                <ul>
                  {debts.map((t) => (
                    <li
                      key={t._id}
                      className="py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {t.amount.toFixed(2)} ₺
                        </span>
                        <span className="text-xs text-gray-500">
                          {format(parseISO(t.createdAt), "dd MMMM yyyy HH.mm", {
                            locale: tr,
                          })}
                        </span>
                      </div>
                      {t.description && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {t.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Ödeme Detay Modalı */}
        {showOdemeDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowOdemeDetail(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Kapat
              </button>
              <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Ödeme Detayı
              </h4>
              {debts.filter((t) => (t.paidAmount || 0) > 0).length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Ödeme yok.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                        Tutar
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                        Açıklama
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                        Tarih
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts
                      .filter((t) => (t.paidAmount || 0) > 0)
                      .map((t) => (
                        <tr
                          key={t._id}
                          className="border-b border-gray-100 dark:border-gray-700"
                        >
                          <td className="text-green-600 font-semibold">
                            {(t.paidAmount || 0).toFixed(2)} ₺
                          </td>
                          <td className="text-gray-600 dark:text-gray-300">
                            {t.description || "-"}
                          </td>
                          <td className="text-xs text-gray-500">
                            {format(
                              parseISO(t.updatedAt ?? ""),
                              "dd MMMM yyyy HH.mm",
                              { locale: tr }
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Borç Detay Modalı */}
        {debtDetailOpen && selectedDebt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Borç Detayı
                  </h3>
                  <button
                    onClick={() => setDebtDetailOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tutar
                    </label>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedDebt.amount.toFixed(2)} ₺
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Durum
                    </label>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedDebt.isPaid
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {selectedDebt.isPaid ? "Ödendi" : "Borçlu"}
                    </span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Açıklama
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedDebt.description || "Açıklama yok"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Borç Türü
                    </label>
                    <p className="text-gray-900 dark:text-white capitalize">
                      {selectedDebt.type === "sale"
                        ? "Satış Borcu"
                        : selectedDebt.type === "manual"
                        ? "Manuel Borç"
                        : selectedDebt.type === "adjustment"
                        ? "Düzeltme"
                        : selectedDebt.type}
                    </p>
                  </div>

                  {selectedDebt.saleId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Satış Detayı
                      </label>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Bu borç bir satış işleminden kaynaklanıyor.
                        </p>
                        {selectedDebt.saleId &&
                          typeof selectedDebt.saleId === "object" && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">
                                Satış Tarihi:{" "}
                                {format(
                                  parseISO(selectedDebt.saleId.createdAt ?? ""),
                                  "dd MMM yyyy HH:mm",
                                  { locale: tr }
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                Satış Tutarı:{" "}
                                {selectedDebt.saleId.totalAmount?.toFixed(2) ||
                                  "0.00"}{" "}
                                ₺
                              </p>
                              {/* Ürünler tablosu */}
                              {Array.isArray(selectedDebt.saleId.items) &&
                              selectedDebt.saleId.items.length > 0 ? (
                                <table className="w-full text-xs mt-2 border-t border-gray-200 dark:border-gray-700">
                                  <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                      <th className="text-left py-1 pr-2 font-medium">
                                        Ürün
                                      </th>
                                      <th className="text-left py-1 pr-2 font-medium">
                                        Adet
                                      </th>
                                      <th className="text-left py-1 pr-2 font-medium">
                                        Birim Fiyat
                                      </th>
                                      <th className="text-left py-1 pr-2 font-medium">
                                        Toplam
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedDebt.saleId.items.map(
                                      (item: SaleItem, idx: number) => (
                                        <tr
                                          key={idx}
                                          className="border-b border-gray-200 dark:border-gray-600"
                                        >
                                          <td className="pr-2 py-1 font-medium">
                                            {item.productName || "-"}
                                          </td>
                                          <td className="pr-2 py-1">
                                            {item.quantity || 0} adet
                                          </td>
                                          <td className="pr-2 py-1">
                                            {item.price?.toFixed(2) || "0.00"} ₺
                                          </td>
                                          <td className="pr-2 py-1 font-semibold">
                                            {(
                                              (item.price || 0) *
                                              (item.quantity || 0)
                                            ).toFixed(2)}{" "}
                                            ₺
                                          </td>
                                        </tr>
                                      )
                                    )}
                                  </tbody>
                                </table>
                              ) : (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                                  <div className="flex justify-between">
                                    <span className="font-medium">Ürün:</span>
                                    <span>
                                      {selectedDebt.saleId.productName || "-"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">Adet:</span>
                                    <span>
                                      {selectedDebt.saleId.quantity || 0} adet
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-medium">
                                      Birim Fiyat:
                                    </span>
                                    <span>
                                      {selectedDebt.saleId.price?.toFixed(2) ||
                                        "0.00"}{" "}
                                      ₺
                                    </span>
                                  </div>
                                  <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span>Toplam:</span>
                                    <span>
                                      {(
                                        (selectedDebt.saleId.price || 0) *
                                        (selectedDebt.saleId.quantity || 0)
                                      ).toFixed(2)}{" "}
                                      ₺
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Oluşturulma Tarihi
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {format(
                        parseISO(selectedDebt.createdAt ?? ""),
                        "dd MMM yyyy HH:mm",
                        { locale: tr }
                      )}
                    </p>
                  </div>

                  {(selectedDebt.paidAmount || 0) > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Ödenen Tutar
                      </label>
                      <p className="text-green-600 font-semibold">
                        {(selectedDebt.paidAmount || 0).toFixed(2)} ₺
                      </p>
                    </div>
                  )}

                  {selectedDebt.dueDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Vade Tarihi
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {format(
                          parseISO(selectedDebt.dueDate ?? ""),
                          "dd MMM yyyy",
                          {
                            locale: tr,
                          }
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setDebtDetailOpen(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerDetailModal;
