import React, { useState } from "react";
import { Customer, Sale, Debt, CustomerPayment, SubCustomer } from "../types";
import { customerService } from "../services/customerService";
import { debtService } from "../services/debtService";
import { customerPaymentService } from "../services/customerPaymentService";
import { subCustomerService } from "../services/subCustomerService";
import { saleItemService } from "../services/saleItemService";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import axios from "axios";

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
  const [payments, setPayments] = React.useState<CustomerPayment[]>([]);
  const [debtSummary, setDebtSummary] = React.useState<{
    totalDebt: number;
    totalPaid: number;
    remainingDebt: number;
  }>({ totalDebt: 0, totalPaid: 0, remainingDebt: 0 });
  const [trxForm, setTrxForm] = React.useState({
    amount: "",
    description: "",
    paymentType: "nakit" as
      | "nakit"
      | "kredi_karti"
      | "havale"
      | "cek"
      | "diger",
    subCustomerId: "",
  });
  const [trxLoading, setTrxLoading] = React.useState(false);
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [saleItems, setSaleItems] = React.useState<
    Array<{
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
    }>
  >([]);
  const [subCustomers, setSubCustomers] = React.useState<SubCustomer[]>([]);
  // Alt müşteri ekleme ile ilgili state'ler kaldırıldı

  // SubCustomer arama state'leri
  const [searchTerm, setSearchTerm] = React.useState("");
  // Dropdown ile ilgili state'ler kaldırıldı - artık local filtreleme yapıyoruz
  const [selectedSubCustomer, setSelectedSubCustomer] =
    React.useState<SubCustomer | null>(null);

  const [selectedPayment] = useState<CustomerPayment | null>(null);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<
    "debts" | "sales" | "closed_accounts"
  >("debts");

  // Sıralama state'leri - varsayılan olarak en yeni tarihli üstte
  const [transactionSort] = React.useState<
    "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  >("date_desc");
  const [paymentSort] = React.useState<
    "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  >("date_desc");
  const [salesSort] = React.useState<
    "date_desc" | "date_asc" | "amount_desc" | "amount_asc"
  >("date_desc");

  // Tarih aralığı state'leri
  const [transactionStartDate] = React.useState<string>("");
  const [transactionEndDate] = React.useState<string>("");
  const [paymentStartDate] = React.useState<string>("");
  const [paymentEndDate] = React.useState<string>("");
  const [salesStartDate] = React.useState<string>("");
  const [salesEndDate] = React.useState<string>("");

  React.useEffect(() => {
    if (customer) {
      setTrxForm({
        amount: "",
        description: "",
        paymentType: "nakit" as
          | "nakit"
          | "kredi_karti"
          | "havale"
          | "cek"
          | "diger",
        subCustomerId: "",
      });
      setTrxLoading(false); // Başlangıçta false olmalı

      // Borç bilgilerini getir
      debtService
        .getByCustomerId(customer.id)
        .then((data) => {
          // data hem object hem de array olabilir
          const debtsArray = Array.isArray(data) ? data : data.debts || [];
          setDebts(
            debtsArray.map((d) => ({
              ...d,
              createdAt: d.createdAt?.toString() ?? "",
              updatedAt: d.updatedAt?.toString() ?? undefined,
              dueDate: d.dueDate?.toString() ?? undefined,
            })) as Debt[]
          );

          // API'den gelen özet bilgileri kaydet
          if (!Array.isArray(data)) {
            setDebtSummary({
              totalDebt: data.totalDebt || 0,
              totalPaid: data.totalPaid || 0,
              remainingDebt: data.remainingDebt || 0,
            });
          }
        })
        .catch((error) => {
          console.error("Borç bilgileri getirilemedi:", error);
          setDebts([]); // Hata durumunda boş array
        });

      // Ödeme bilgilerini getir
      customerPaymentService
        .getByCustomerId(customer.id)
        .then((data) => {
          setPayments(data);
        })
        .catch((error) => {
          console.error("Ödeme bilgileri getirilemedi:", error);
        });

      // Satış bilgilerini getir
      axios
        .get(`/api/sales?customerId=${customer.id}`)
        .then((response) => {
          setSales(
            response.data.map((s: Sale) => ({
              ...s,
              createdAt: s.createdAt?.toString() ?? undefined,
              soldAt: s.soldAt?.toString() ?? "",
            }))
          );
        })
        .catch((error) => {
          console.error("Satış bilgileri getirilemedi:", error);
          setSales([]);
        })
        .finally(() => {
          setTrxLoading(false);
        });

      // Sale items verilerini getir
      saleItemService
        .getByCustomerId(customer.id)
        .then((saleItemsData) => {
          setSaleItems(saleItemsData);
        })
        .catch((error) => {
          console.error("Sale items getirme hatası:", error);
          setSaleItems([]);
        });

      // SubCustomer'ları getir
      subCustomerService
        .getByCustomerId(customer.id)
        .then((data) => {
          setSubCustomers(data);
        })
        .catch((error) => {
          console.error("SubCustomer'lar getirilemedi:", error);
          setSubCustomers([]);
        });
    }
  }, [customer]);

  if (!open || !customer) return null;

  // API'den gelen özet bilgileri kullan
  const {
    totalDebt: totalDebtAmount,
    totalPaid: totalPaidAmount,
    remainingDebt,
  } = debtSummary;

  // Ana müşteri borçları ve ödemeleri (dropdown'lar için)
  const mainCustomerDebts = (debts || []).filter(
    (d) => !d.subCustomerId || d.subCustomerId === ""
  );
  const mainCustomerPayments = (payments || []).filter(
    (p) => !p.subCustomerId || p.subCustomerId === ""
  );

  const handleTrxChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setTrxForm({ ...trxForm, [e.target.name]: e.target.value });
  };

  const handleTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !trxForm.amount.trim()) return;

    const paymentAmount = parseFloat(trxForm.amount);
    if (paymentAmount <= 0) {
      alert("Ödeme tutarı 0'dan büyük olmalıdır.");
      return;
    }

    // Borç kontrolü - eğer subCustomer seçiliyse o hesabın borcunu kontrol et
    let maxPaymentAmount = remainingDebt;
    if (trxForm.subCustomerId) {
      // Seçili alt müşterinin active olup olmadığını kontrol et
      const selectedSubCustomer = subCustomers.find(
        (sc) => sc.id === trxForm.subCustomerId
      );

      if (selectedSubCustomer && selectedSubCustomer.status === "active") {
        const subCustomerDebts = debts.filter(
          (d) =>
            d.subCustomerId === trxForm.subCustomerId ||
            (typeof d.subCustomerId === "object" &&
              d.subCustomerId?._id === trxForm.subCustomerId)
        );
        const subCustomerPayments = payments.filter(
          (p) =>
            p.subCustomerId === trxForm.subCustomerId ||
            (typeof p.subCustomerId === "object" &&
              p.subCustomerId?._id === trxForm.subCustomerId)
        );

        const subCustomerTotalDebt = subCustomerDebts.reduce(
          (sum, d) => sum + (d.amount || 0),
          0
        );
        const subCustomerTotalPaid = subCustomerPayments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );
        maxPaymentAmount = Math.max(
          0,
          subCustomerTotalDebt - subCustomerTotalPaid
        );
      } else {
        // Eğer seçili alt müşteri active değilse, ana müşteri borcunu göster
        maxPaymentAmount = remainingDebt;
      }
    }

    // Borçtan fazla ödeme kontrolü
    if (paymentAmount > maxPaymentAmount) {
      const errorMessage =
        maxPaymentAmount > 0
          ? `Borçtan fazla ödeme alamazsınız. Maksimum ödeme tutarı: ${maxPaymentAmount.toFixed(
              2
            )} ₺`
          : "Bu müşterinin borcu bulunmuyor. Ödeme yapılamaz.";

      alert(errorMessage);
      return;
    }

    // Borç yoksa ödeme yapılmasını engelle
    if (maxPaymentAmount <= 0) {
      alert("Bu müşterinin borcu bulunmuyor. Ödeme yapılamaz.");
      return;
    }

    setTrxLoading(true);

    try {
      // Yeni ödeme sistemi ile ödeme kaydı oluştur
      const paymentData = {
        customerId: customer.id,
        amount: paymentAmount,
        paymentType: trxForm.paymentType,
        description: trxForm.description || "Ödeme",
        paymentDate: new Date().toISOString(),
        status: "active" as "active" | "cancelled" | "refunded",
        subCustomerId: trxForm.subCustomerId || undefined,
      };

      await customerPaymentService.create(paymentData);

      setTrxForm({
        amount: "",
        description: "",
        paymentType: "nakit" as
          | "nakit"
          | "kredi_karti"
          | "havale"
          | "cek"
          | "diger",
        subCustomerId: "",
      });

      // Ödeme listesini yenile
      const newPayments = await customerPaymentService.getByCustomerId(
        customer.id
      );
      setPayments(newPayments);

      // Borç özetini yenile
      const debtData = await debtService.getByCustomerId(customer.id);
      if (!Array.isArray(debtData)) {
        setDebtSummary({
          totalDebt: debtData.totalDebt || 0,
          totalPaid: debtData.totalPaid || 0,
          remainingDebt: debtData.remainingDebt || 0,
        });
      }

      // Satış listesini de yenile
      const salesResponse = await axios.get(
        `/api/sales?customerId=${customer.id}`
      );
      setSales(
        salesResponse.data.map((s: Sale) => ({
          ...s,
          createdAt: s.createdAt?.toString() ?? undefined,
          soldAt: s.soldAt?.toString() ?? "",
        }))
      );

      // Alt müşteri hesabı kontrol et ve otomatik kapat
      if (trxForm.subCustomerId) {
        const subCustomer = subCustomers.find(
          (sc) => sc.id === trxForm.subCustomerId
        );
        if (subCustomer && subCustomer.status === "active") {
          // Bu alt müşteriye ait borçları hesapla
          const subCustomerDebts = debts.filter(
            (d) =>
              d.subCustomerId === trxForm.subCustomerId ||
              (typeof d.subCustomerId === "object" &&
                d.subCustomerId?._id === trxForm.subCustomerId)
          );

          // Bu alt müşteriye ait ödemeleri hesapla (yeni ödeme dahil)
          const subCustomerPayments = payments.filter(
            (p) =>
              p.subCustomerId === trxForm.subCustomerId ||
              (typeof p.subCustomerId === "object" &&
                p.subCustomerId?._id === trxForm.subCustomerId)
          );

          const totalDebt = subCustomerDebts.reduce(
            (sum, d) => sum + (d.amount || 0),
            0
          );
          const totalPaid =
            subCustomerPayments.reduce((sum, p) => sum + (p.amount || 0), 0) +
            paymentAmount;

          // Eğer tüm borçlar ödendiyse hesabı kapat
          if (totalPaid >= totalDebt && totalDebt > 0) {
            await subCustomerService.closeAccount(trxForm.subCustomerId);
            // Alt müşteri listesini yenile
            const updatedSubCustomers =
              await subCustomerService.getByCustomerId(customer.id);
            setSubCustomers(updatedSubCustomers);
          }
        }
      }

      if (fetchCustomers) fetchCustomers();
    } catch (error) {
      console.error("Ödeme işlemi hatası:", error);
      alert("Ödeme kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      console.log("trxLoading false yapılıyor");
      setTrxLoading(false);
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

  // SubCustomer arama fonksiyonu - Local filtreleme
  const searchSubCustomers = (term: string) => {
    if (!customer || !term.trim()) {
      setSelectedSubCustomer(null);
      return;
    }

    // Local filtreleme - alt müşteriler arasında arama
    const filtered = subCustomers.filter(
      (sc) =>
        sc.name.toLowerCase().includes(term.toLowerCase()) ||
        (sc.phone && sc.phone.toLowerCase().includes(term.toLowerCase()))
    );

    setSelectedSubCustomer(filtered.length > 0 ? filtered[0] : null);
  };

  // Arama input değişikliği
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim()) {
      searchSubCustomers(value);
    } else {
      setSelectedSubCustomer(null);
    }
  };

  // Arama temizleme
  const clearSearch = () => {
    setSearchTerm("");
    setSelectedSubCustomer(null);
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
  const sortedPayments = [...payments].sort((a, b) => {
    if (paymentSort === "date_desc")
      return (
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      );
    if (paymentSort === "date_asc")
      return (
        new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      );
    if (paymentSort === "amount_desc") return b.amount - a.amount;
    if (paymentSort === "amount_asc") return a.amount - b.amount;
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
    // Sadece ödenmemiş borçları göster
    if (t.isPaid) return false;

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col p-0 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl z-10"
        >
          ×
        </button>

        {/* Üst başlık ve özet */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
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
                Tüm Borç
              </span>
              <span className="font-bold text-lg text-red-500">
                {totalDebtAmount.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ödenen Borç
              </span>
              <span className="font-bold text-lg text-green-500">
                {totalPaidAmount.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Kalan Borç
              </span>
              <span
                className={`font-bold text-lg ${
                  remainingDebt > 0 ? "text-orange-500" : "text-green-500"
                }`}
              >
                {remainingDebt > 0
                  ? `${remainingDebt.toFixed(2)} ₺`
                  : "Ödendi ✓"}
              </span>
            </div>
          </div>
        </div>

        {/* Ödeme Alma Alanı */}
        <div className="w-full px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Ödeme Al
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Müşteriden ödeme almak için aşağıdaki formu kullanın.
            </p>
            {/* Maksimum ödeme tutarı bilgisi */}
            {(() => {
              let maxPaymentAmount = remainingDebt;
              if (trxForm.subCustomerId) {
                // Seçili alt müşterinin active olup olmadığını kontrol et
                const selectedSubCustomer = subCustomers.find(
                  (sc) => sc.id === trxForm.subCustomerId
                );

                if (
                  selectedSubCustomer &&
                  selectedSubCustomer.status === "active"
                ) {
                  const subCustomerDebts = debts.filter(
                    (d) =>
                      d.subCustomerId === trxForm.subCustomerId ||
                      (typeof d.subCustomerId === "object" &&
                        d.subCustomerId?._id === trxForm.subCustomerId)
                  );
                  const subCustomerPayments = payments.filter(
                    (p) =>
                      p.subCustomerId === trxForm.subCustomerId ||
                      (typeof p.subCustomerId === "object" &&
                        p.subCustomerId?._id === trxForm.subCustomerId)
                  );

                  const subCustomerTotalDebt = subCustomerDebts.reduce(
                    (sum, d) => sum + (d.amount || 0),
                    0
                  );
                  const subCustomerTotalPaid = subCustomerPayments.reduce(
                    (sum, p) => sum + (p.amount || 0),
                    0
                  );
                  maxPaymentAmount = Math.max(
                    0,
                    subCustomerTotalDebt - subCustomerTotalPaid
                  );
                } else {
                  // Eğer seçili alt müşteri active değilse, ana müşteri borcunu göster
                  maxPaymentAmount = remainingDebt;
                }
              }

              return maxPaymentAmount > 0 ? (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Maksimum ödeme tutarı:{" "}
                  <strong>{maxPaymentAmount.toFixed(2)} ₺</strong>
                </p>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  ✅ Tüm borçlar ödendi
                </p>
              );
            })()}
          </div>
          <form
            onSubmit={handleTrxSubmit}
            className="flex flex-col md:flex-row w-full gap-3"
          >
            {/* Alt müşteri seçimi */}
            <select
              name="subCustomerId"
              value={trxForm.subCustomerId || ""}
              onChange={(e) =>
                setTrxForm({ ...trxForm, subCustomerId: e.target.value })
              }
              className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Alt Müşteri Seç (opsiyonel)</option>
              {subCustomers
                .filter((sc) => sc.status === "active")
                .map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name} {sc.phone ? `(${sc.phone})` : ""}
                  </option>
                ))}
            </select>
            <input
              name="amount"
              value={trxForm.amount}
              onChange={handleTrxChange}
              placeholder="Ödeme Tutarı"
              type="number"
              min="0"
              max={(() => {
                let maxAmount = remainingDebt;
                if (trxForm.subCustomerId) {
                  const selectedSubCustomer = subCustomers.find(
                    (sc) => sc.id === trxForm.subCustomerId
                  );
                  if (
                    selectedSubCustomer &&
                    selectedSubCustomer.status === "active"
                  ) {
                    const subCustomerDebts = debts.filter(
                      (d) =>
                        d.subCustomerId === trxForm.subCustomerId ||
                        (typeof d.subCustomerId === "object" &&
                          d.subCustomerId?._id === trxForm.subCustomerId)
                    );
                    const subCustomerPayments = payments.filter(
                      (p) =>
                        p.subCustomerId === trxForm.subCustomerId ||
                        (typeof p.subCustomerId === "object" &&
                          p.subCustomerId?._id === trxForm.subCustomerId)
                    );
                    const subCustomerTotalDebt = subCustomerDebts.reduce(
                      (sum, d) => sum + (d.amount || 0),
                      0
                    );
                    const subCustomerTotalPaid = subCustomerPayments.reduce(
                      (sum, p) => sum + (p.amount || 0),
                      0
                    );
                    maxAmount = Math.max(
                      0,
                      subCustomerTotalDebt - subCustomerTotalPaid
                    );
                  }
                }
                return maxAmount;
              })()}
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
              <option value="kredi_karti">Kredi Kartı</option>
              <option value="havale">Havale</option>
              <option value="cek">Çek</option>
              <option value="diger">Diğer</option>
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
              className={`px-5 py-2 rounded font-semibold text-sm ${
                (() => {
                  let maxAmount = remainingDebt;
                  if (trxForm.subCustomerId) {
                    const selectedSubCustomer = subCustomers.find(
                      (sc) => sc.id === trxForm.subCustomerId
                    );
                    if (
                      selectedSubCustomer &&
                      selectedSubCustomer.status === "active"
                    ) {
                      const subCustomerDebts = debts.filter(
                        (d) =>
                          d.subCustomerId === trxForm.subCustomerId ||
                          (typeof d.subCustomerId === "object" &&
                            d.subCustomerId?._id === trxForm.subCustomerId)
                      );
                      const subCustomerPayments = payments.filter(
                        (p) =>
                          p.subCustomerId === trxForm.subCustomerId ||
                          (typeof p.subCustomerId === "object" &&
                            p.subCustomerId?._id === trxForm.subCustomerId)
                      );
                      const subCustomerTotalDebt = subCustomerDebts.reduce(
                        (sum, d) => sum + (d.amount || 0),
                        0
                      );
                      const subCustomerTotalPaid = subCustomerPayments.reduce(
                        (sum, p) => sum + (p.amount || 0),
                        0
                      );
                      maxAmount = Math.max(
                        0,
                        subCustomerTotalDebt - subCustomerTotalPaid
                      );
                    }
                  }
                  return maxAmount > 0;
                })()
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-gray-400 text-gray-600 cursor-not-allowed"
              }`}
              disabled={
                trxLoading ||
                (() => {
                  let maxAmount = remainingDebt;
                  if (trxForm.subCustomerId) {
                    const selectedSubCustomer = subCustomers.find(
                      (sc) => sc.id === trxForm.subCustomerId
                    );
                    if (
                      selectedSubCustomer &&
                      selectedSubCustomer.status === "active"
                    ) {
                      const subCustomerDebts = debts.filter(
                        (d) =>
                          d.subCustomerId === trxForm.subCustomerId ||
                          (typeof d.subCustomerId === "object" &&
                            d.subCustomerId?._id === trxForm.subCustomerId)
                      );
                      const subCustomerPayments = payments.filter(
                        (p) =>
                          p.subCustomerId === trxForm.subCustomerId ||
                          (typeof p.subCustomerId === "object" &&
                            p.subCustomerId?._id === trxForm.subCustomerId)
                      );
                      const subCustomerTotalDebt = subCustomerDebts.reduce(
                        (sum, d) => sum + (d.amount || 0),
                        0
                      );
                      const subCustomerTotalPaid = subCustomerPayments.reduce(
                        (sum, p) => sum + (p.amount || 0),
                        0
                      );
                      maxAmount = Math.max(
                        0,
                        subCustomerTotalDebt - subCustomerTotalPaid
                      );
                    }
                  }
                  return maxAmount <= 0;
                })()
              }
            >
              {trxLoading
                ? "Kaydediliyor..."
                : (() => {
                    let maxAmount = remainingDebt;
                    if (trxForm.subCustomerId) {
                      const selectedSubCustomer = subCustomers.find(
                        (sc) => sc.id === trxForm.subCustomerId
                      );
                      if (
                        selectedSubCustomer &&
                        selectedSubCustomer.status === "active"
                      ) {
                        const subCustomerDebts = debts.filter(
                          (d) =>
                            d.subCustomerId === trxForm.subCustomerId ||
                            (typeof d.subCustomerId === "object" &&
                              d.subCustomerId?._id === trxForm.subCustomerId)
                        );
                        const subCustomerPayments = payments.filter(
                          (p) =>
                            p.subCustomerId === trxForm.subCustomerId ||
                            (typeof p.subCustomerId === "object" &&
                              p.subCustomerId?._id === trxForm.subCustomerId)
                        );
                        const subCustomerTotalDebt = subCustomerDebts.reduce(
                          (sum, d) => sum + (d.amount || 0),
                          0
                        );
                        const subCustomerTotalPaid = subCustomerPayments.reduce(
                          (sum, p) => sum + (p.amount || 0),
                          0
                        );
                        maxAmount = Math.max(
                          0,
                          subCustomerTotalDebt - subCustomerTotalPaid
                        );
                      }
                    }
                    return maxAmount > 0 ? "Ödeme Al" : "Borç Yok";
                  })()}
            </button>
          </form>
        </div>

        {/* Alt ana içerik */}
        <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-8 px-4 md:px-6 pb-6 pt-4 overflow-y-auto">
          {/* Tab'lar */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-700 pr-0 md:pr-8 overflow-hidden">
            {/* Tab başlıkları */}
            <div className="flex gap-1 mb-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab("debts")}
                className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
                  activeTab === "debts"
                    ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
                    : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
                }`}
              >
                Borçlar ({filteredDebts.length})
              </button>
              <button
                onClick={() => setActiveTab("sales")}
                className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
                  activeTab === "sales"
                    ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
                    : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
                }`}
              >
                Satışlar ({filteredSales.length})
              </button>
              <button
                onClick={() => setActiveTab("closed_accounts")}
                className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
                  activeTab === "closed_accounts"
                    ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
                    : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
                }`}
              >
                Kapanmış Hesaplar (
                {subCustomers.filter((sc) => sc.status === "inactive").length})
              </button>
            </div>

            {/* Borçlar Tab'ı (accordion) */}
            {activeTab === "debts" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 flex-shrink-0">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
                    Borçlar (Alt Müşterilere Göre)
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Alt müşteri ara (ad veya telefon)..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[250px]"
                      />
                      {searchTerm && (
                        <button
                          onClick={clearSearch}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      )}
                      {/* Dropdown kaldırıldı - artık local filtreleme yapıyoruz */}
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  {/* Seçili alt müşteri varsa sadece onu göster */}
                  {selectedSubCustomer ? (
                    (() => {
                      const scDebts = debts.filter(
                        (d) =>
                          d.subCustomerId === selectedSubCustomer.id ||
                          (typeof d.subCustomerId === "object" &&
                            d.subCustomerId?._id === selectedSubCustomer.id)
                      );
                      const scPayments = payments.filter(
                        (p) =>
                          p.subCustomerId === selectedSubCustomer.id ||
                          (typeof p.subCustomerId === "object" &&
                            p.subCustomerId?._id === selectedSubCustomer.id)
                      );

                      const scTotalDebt = scDebts.reduce(
                        (sum: number, d: any) => sum + (d.amount || 0),
                        0
                      );
                      const scTotalPaid = scPayments.reduce(
                        (sum: number, p: any) => sum + (p.amount || 0),
                        0
                      );

                      return (
                        <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                          <div className="px-4 py-3 bg-blue-100 dark:bg-blue-800/30 rounded-t-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="font-bold text-lg text-blue-900 dark:text-blue-100">
                                  {selectedSubCustomer.name}
                                </span>
                                {selectedSubCustomer.phone && (
                                  <span className="text-sm text-blue-700 dark:text-blue-300">
                                    {selectedSubCustomer.phone}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Tüm Borç
                                  </span>
                                  <span className="font-bold text-red-600">
                                    {scDebts
                                      .reduce(
                                        (sum: number, d: Debt) =>
                                          sum + (d.amount || 0),
                                        0
                                      )
                                      .toFixed(2)}{" "}
                                    ₺
                                  </span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Ödenen
                                  </span>
                                  <span className="font-bold text-green-600">
                                    {scPayments
                                      .reduce(
                                        (sum: number, p: CustomerPayment) =>
                                          sum + (p.amount || 0),
                                        0
                                      )
                                      .toFixed(2)}{" "}
                                    ₺
                                  </span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Kalan
                                  </span>
                                  <span className="font-bold text-red-600">
                                    {(
                                      scDebts.reduce(
                                        (sum: number, d: Debt) =>
                                          sum + (d.amount || 0),
                                        0
                                      ) -
                                      scPayments.reduce(
                                        (sum: number, p: CustomerPayment) =>
                                          sum + (p.amount || 0),
                                        0
                                      )
                                    ).toFixed(2)}{" "}
                                    ₺
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 pb-4">
                            {scDebts.length === 0 ? (
                              <div className="text-gray-400 text-sm mb-2">
                                Borç yok
                              </div>
                            ) : (
                              <table className="w-full text-sm mb-2 border border-gray-200 dark:border-gray-700">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Tutar
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Ürün Kodu
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Adet Malzeme
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Tarih
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {scDebts.map((d) => (
                                    <tr
                                      key={d._id}
                                      className="border-b border-gray-100 dark:border-gray-700"
                                    >
                                      <td className="text-red-600 font-semibold py-2 px-3">
                                        {d.amount.toFixed(2)} ₺
                                      </td>
                                      <td className="text-gray-500 dark:text-gray-300 py-2 px-3">
                                        {(() => {
                                          if (
                                            d.saleId &&
                                            typeof d.saleId === "object" &&
                                            d.saleId.items &&
                                            Array.isArray(d.saleId.items)
                                          ) {
                                            return d.saleId.items
                                              .map((item) => item.barcode)
                                              .join(", ");
                                          }
                                          if (
                                            d.saleId &&
                                            typeof d.saleId === "object" &&
                                            d.saleId.barcode
                                          ) {
                                            return d.saleId.barcode;
                                          }
                                          return "-";
                                        })()}
                                      </td>
                                      <td className="text-gray-500 dark:text-gray-300">
                                        {(() => {
                                          if (
                                            d.saleId &&
                                            typeof d.saleId === "object" &&
                                            d.saleId.items &&
                                            Array.isArray(d.saleId.items)
                                          ) {
                                            return d.saleId.items
                                              .map(
                                                (item) =>
                                                  `${item.quantity || 1} adet ${
                                                    item.productName || ""
                                                  }`
                                              )
                                              .join(", ");
                                          }
                                          return "-";
                                        })()}
                                      </td>
                                      <td className="text-xs text-gray-400">
                                        {format(
                                          parseISO(d.createdAt),
                                          "dd MMM yyyy HH:mm",
                                          { locale: tr }
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}

                            {scPayments.length === 0 ? (
                              <div className="text-gray-400 text-sm">
                                Ödeme yok
                              </div>
                            ) : (
                              <table className="w-full text-sm border border-gray-200 dark:border-gray-700">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-gray-800">
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Tutar
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Ödeme Türü
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Açıklama
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 py-2 px-3 border-b border-gray-200 dark:border-gray-600">
                                      Tarih
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {scPayments.map((p) => (
                                    <tr
                                      key={p._id}
                                      className="border-b border-gray-100 dark:border-gray-700"
                                    >
                                      <td className="text-green-600 font-semibold py-2 px-3">
                                        {p.amount.toFixed(2)} ₺
                                      </td>
                                      <td className="text-gray-500 dark:text-gray-300">
                                        {p.paymentType === "nakit"
                                          ? "Nakit"
                                          : p.paymentType === "kredi_karti"
                                          ? "Kredi Kartı"
                                          : p.paymentType === "havale"
                                          ? "Havale"
                                          : p.paymentType === "cek"
                                          ? "Çek"
                                          : p.paymentType === "diger"
                                          ? "Diğer"
                                          : p.paymentType}
                                      </td>
                                      <td className="text-gray-500 dark:text-gray-300">
                                        {p.description || "-"}
                                      </td>
                                      <td className="text-xs text-gray-400">
                                        {format(
                                          parseISO(p.paymentDate),
                                          "dd MMM yyyy HH:mm",
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
                      );
                    })()
                  ) : // Ana müşteri borçları
                  mainCustomerDebts.length > 0 ||
                    mainCustomerPayments.length > 0 ? (
                    <details className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-lg">
                            {customer.name} (Ana Müşteri)
                          </span>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-1">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-gray-500">
                                Tüm Borç
                              </span>
                              <span className="font-bold text-red-500">
                                {mainCustomerDebts
                                  .reduce((sum, d) => sum + (d.amount || 0), 0)
                                  .toFixed(2)}{" "}
                                ₺
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-gray-500">
                                Ödenen
                              </span>
                              <span className="font-bold text-green-500">
                                {mainCustomerPayments
                                  .reduce((sum, p) => sum + (p.amount || 0), 0)
                                  .toFixed(2)}{" "}
                                ₺
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-gray-500">
                                Kalan
                              </span>
                              <span className="font-bold text-orange-500">
                                {(
                                  mainCustomerDebts.reduce(
                                    (sum, d) => sum + (d.amount || 0),
                                    0
                                  ) -
                                  mainCustomerPayments.reduce(
                                    (sum, p) => sum + (p.amount || 0),
                                    0
                                  )
                                ).toFixed(2)}{" "}
                                ₺
                              </span>
                            </div>
                          </div>
                        </div>
                      </summary>
                      <div className="px-4 pb-4">
                        {mainCustomerDebts.length === 0 ? (
                          <div className="text-gray-400 text-sm mb-2">
                            Borç yok
                          </div>
                        ) : (
                          <table className="w-full text-sm mb-2">
                            <thead>
                              <tr>
                                <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                  Tutar
                                </th>
                                <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                  Ürün Kodu
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
                              {mainCustomerDebts.map((d) => (
                                <tr key={d._id}>
                                  <td className="text-red-600 font-semibold">
                                    {d.amount.toFixed(2)} ₺
                                  </td>
                                  <td className="text-gray-500 dark:text-gray-300">
                                    {(() => {
                                      if (
                                        d.saleId &&
                                        typeof d.saleId === "object" &&
                                        d.saleId.items &&
                                        Array.isArray(d.saleId.items)
                                      ) {
                                        return d.saleId.items
                                          .map((item) => item.barcode)
                                          .join(", ");
                                      }
                                      if (
                                        d.saleId &&
                                        typeof d.saleId === "object" &&
                                        d.saleId.barcode
                                      ) {
                                        return d.saleId.barcode;
                                      }
                                      return "-";
                                    })()}
                                  </td>
                                  <td className="text-gray-500 dark:text-gray-300">
                                    {(() => {
                                      if (
                                        d.saleId &&
                                        typeof d.saleId === "object" &&
                                        d.saleId.items &&
                                        Array.isArray(d.saleId.items)
                                      ) {
                                        return d.saleId.items
                                          .map(
                                            (item) =>
                                              `${item.quantity || 1} adet ${
                                                item.productName || ""
                                              }`
                                          )
                                          .join(", ");
                                      }
                                      return "-";
                                    })()}
                                  </td>
                                  <td className="text-xs text-gray-400">
                                    {format(
                                      parseISO(d.createdAt),
                                      "dd MMM yyyy HH:mm",
                                      { locale: tr }
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}

                        {mainCustomerPayments.length === 0 ? (
                          <div className="text-gray-400 text-sm">Ödeme yok</div>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                  Tutar
                                </th>
                                <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                  Ödeme Tipi
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
                              {mainCustomerPayments.map((p) => (
                                <tr key={p._id}>
                                  <td className="text-green-600 font-semibold">
                                    {p.amount.toFixed(2)} ₺
                                  </td>
                                  <td className="text-gray-500 dark:text-gray-300">
                                    {p.paymentType === "nakit"
                                      ? "Nakit"
                                      : p.paymentType === "kredi_karti"
                                      ? "Kredi Kartı"
                                      : p.paymentType === "havale"
                                      ? "Havale"
                                      : p.paymentType === "cek"
                                      ? "Çek"
                                      : p.paymentType === "diger"
                                      ? "Diğer"
                                      : p.paymentType}
                                  </td>
                                  <td className="text-gray-500 dark:text-gray-300">
                                    {p.description || "-"}
                                  </td>
                                  <td className="text-xs text-gray-400">
                                    {format(
                                      parseISO(p.paymentDate),
                                      "dd MMM yyyy HH:mm",
                                      { locale: tr }
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </details>
                  ) : null}

                  {subCustomers.length === 0 ? (
                    <div className="text-center text-gray-400 py-6">
                      Alt müşteri yok
                    </div>
                  ) : (
                    subCustomers
                      .filter((sc) => sc.status !== "inactive")
                      .filter((sc) => {
                        if (!searchTerm.trim()) return true;
                        return (
                          sc.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()) ||
                          (sc.phone &&
                            sc.phone
                              .toLowerCase()
                              .includes(searchTerm.toLowerCase()))
                        );
                      })
                      .map((sc) => {
                        const scDebts = debts.filter(
                          (d) =>
                            d.subCustomerId === sc.id ||
                            (typeof d.subCustomerId === "object" &&
                              d.subCustomerId?._id === sc.id)
                        );
                        const scPayments = payments.filter(
                          (p) =>
                            p.subCustomerId === sc.id ||
                            (typeof p.subCustomerId === "object" &&
                              p.subCustomerId?._id === sc.id)
                        );

                        // Alt müşteri için borç hesaplamaları
                        const scTotalDebt = scDebts.reduce(
                          (sum: number, d: Debt) => sum + (d.amount || 0),
                          0
                        );
                        const scTotalPaid = scPayments.reduce(
                          (sum: number, p: CustomerPayment) =>
                            sum + (p.amount || 0),
                          0
                        );

                        return (
                          <details
                            key={sc.id}
                            className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="font-bold text-lg">
                                  {sc.name}
                                </span>
                                {sc.phone && (
                                  <span className="text-xs text-gray-500">
                                    {sc.phone}
                                  </span>
                                )}
                              </div>
                              <div className="ml-auto flex flex-col items-end gap-1">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Tüm Borç
                                    </span>
                                    <span className="font-bold text-red-500">
                                      {(debts || [])
                                        .filter(
                                          (d) =>
                                            d.subCustomerId === sc.id ||
                                            (typeof d.subCustomerId ===
                                              "object" &&
                                              d.subCustomerId?._id === sc.id)
                                        )
                                        .reduce(
                                          (sum: number, d: Debt) =>
                                            sum + (d.amount || 0),
                                          0
                                        )
                                        .toFixed(2)}{" "}
                                      ₺
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500">
                                      Ödenen
                                    </span>
                                    <span className="font-bold text-green-500">
                                      {(payments || [])
                                        .filter(
                                          (p) =>
                                            p.subCustomerId === sc.id ||
                                            (typeof p.subCustomerId ===
                                              "object" &&
                                              p.subCustomerId?._id === sc.id)
                                        )
                                        .reduce(
                                          (sum: number, p: CustomerPayment) =>
                                            sum + (p.amount || 0),
                                          0
                                        )
                                        .toFixed(2)}{" "}
                                      ₺
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span className="text-xs text-gray-500">
                                      Kalan
                                    </span>
                                    <span className="font-bold text-orange-500">
                                      {(
                                        scDebts.reduce(
                                          (sum: number, d: Debt) =>
                                            sum + (d.amount || 0),
                                          0
                                        ) -
                                        scPayments.reduce(
                                          (sum: number, p: CustomerPayment) =>
                                            sum + (p.amount || 0),
                                          0
                                        )
                                      ).toFixed(2)}{" "}
                                      ₺
                                    </span>
                                  </div>
                                </div>
                                {/* Hesap Durumu */}
                                <div className="flex items-center gap-2 mt-2">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      sc.status === "inactive"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                        : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    }`}
                                  >
                                    {sc.status === "inactive"
                                      ? "Hesap Kapalı"
                                      : "Hesap Açık"}
                                  </span>
                                  {sc.status === "active" && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          // Kalan borç hesapla
                                          const closeDebts = (
                                            debts || []
                                          ).filter(
                                            (d) =>
                                              d.subCustomerId === sc.id ||
                                              (typeof d.subCustomerId ===
                                                "object" &&
                                                d.subCustomerId?._id === sc.id)
                                          );
                                          const closePayments = (
                                            payments || []
                                          ).filter(
                                            (p) =>
                                              p.subCustomerId === sc.id ||
                                              (typeof p.subCustomerId ===
                                                "object" &&
                                                p.subCustomerId?._id === sc.id)
                                          );
                                          const totalDebt = closeDebts.reduce(
                                            (sum: number, d: Debt) =>
                                              sum + (d.amount || 0),
                                            0
                                          );
                                          const totalPaid =
                                            closePayments.reduce(
                                              (
                                                sum: number,
                                                p: CustomerPayment
                                              ) => sum + (p.amount || 0),
                                              0
                                            );
                                          const remainingDebt =
                                            totalDebt - totalPaid;

                                          // Kalan borç varsa ödeme yap
                                          if (remainingDebt > 0) {
                                            const paymentData = {
                                              customerId: customer.id,
                                              subCustomerId: sc.id,
                                              amount: remainingDebt,
                                              description: `Hesap kapatma - Kalan borç ödemesi`,
                                              paymentDate:
                                                new Date().toISOString(),
                                              paymentType: "nakit" as const,
                                              status: "active" as const,
                                            };

                                            await customerPaymentService.create(
                                              paymentData
                                            );
                                          }

                                          // Bu alt müşteriye ait borç kayıtlarını ödenmiş olarak işaretle
                                          const scDebts = debts.filter(
                                            (d) =>
                                              d.subCustomerId === sc.id ||
                                              (typeof d.subCustomerId ===
                                                "object" &&
                                                d.subCustomerId?._id === sc.id)
                                          );

                                          for (const debt of scDebts) {
                                            if (debt._id) {
                                              await debtService.update(
                                                debt._id,
                                                {
                                                  isPaid: true,
                                                }
                                              );
                                            }
                                          }

                                          // Hesabı kapat
                                          await subCustomerService.closeAccount(
                                            sc.id
                                          );

                                          // Verileri yenile
                                          const updatedPayments =
                                            await customerPaymentService.getByCustomerId(
                                              customer.id
                                            );
                                          const updatedSubCustomers =
                                            await subCustomerService.getByCustomerId(
                                              customer.id
                                            );

                                          // Debts'i yeniden yükle
                                          const closeDebtsData =
                                            await debtService.getByCustomerId(
                                              customer.id
                                            );
                                          const closeDebtsArray = Array.isArray(
                                            closeDebtsData
                                          )
                                            ? closeDebtsData
                                            : closeDebtsData.debts || [];
                                          setDebts(closeDebtsArray as Debt[]);
                                          setPayments(updatedPayments);
                                          setSubCustomers(updatedSubCustomers);

                                          console.log(
                                            "Hesap kapatıldı, yeni subCustomers:",
                                            updatedSubCustomers
                                          );

                                          alert(
                                            "Hesap kapatıldı ve kalan borç ödendi!"
                                          );
                                        } catch (error) {
                                          console.error(
                                            "Hesap kapatma hatası:",
                                            error
                                          );
                                          alert(
                                            "Hesap kapatılırken hata oluştu!"
                                          );
                                        }
                                      }}
                                      className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                    >
                                      Hesabı Kapat
                                    </button>
                                  )}
                                </div>
                              </div>
                            </summary>
                            <div className="px-4 pb-4">
                              {(() => {
                                const scDebts = (debts || []).filter(
                                  (d) =>
                                    d.subCustomerId === sc.id ||
                                    (typeof d.subCustomerId === "object" &&
                                      d.subCustomerId?._id === sc.id)
                                );
                                return scDebts.length === 0 ? (
                                  <div className="text-gray-400 text-sm mb-2">
                                    Borç yok
                                  </div>
                                ) : (
                                  <table className="w-full text-sm mb-2">
                                    <thead>
                                      <tr>
                                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                          Tutar
                                        </th>
                                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                          Ürün Kodu
                                        </th>
                                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                          Adet Malzeme
                                        </th>
                                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                          Tarih
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {scDebts.map((d) => (
                                        <tr key={d._id}>
                                          <td className="text-red-600 font-semibold">
                                            {d.amount.toFixed(2)} ₺
                                          </td>
                                          <td className="text-gray-500 dark:text-gray-300">
                                            {(() => {
                                              if (
                                                d.saleId &&
                                                typeof d.saleId === "object" &&
                                                d.saleId.items &&
                                                Array.isArray(d.saleId.items)
                                              ) {
                                                return d.saleId.items
                                                  .map((item) => item.barcode)
                                                  .join(", ");
                                              }
                                              if (
                                                d.saleId &&
                                                typeof d.saleId === "object" &&
                                                d.saleId.barcode
                                              ) {
                                                return d.saleId.barcode;
                                              }
                                              return "-";
                                            })()}
                                          </td>
                                          <td className="text-gray-500 dark:text-gray-300">
                                            {(() => {
                                              if (
                                                d.saleId &&
                                                typeof d.saleId === "object" &&
                                                d.saleId.items &&
                                                Array.isArray(d.saleId.items)
                                              ) {
                                                return d.saleId.items
                                                  .map(
                                                    (item) =>
                                                      `${
                                                        item.quantity || 1
                                                      } adet ${
                                                        item.productName || ""
                                                      }`
                                                  )
                                                  .join(", ");
                                              }
                                              return "-";
                                            })()}
                                          </td>
                                          <td className="text-xs text-gray-400">
                                            {format(
                                              parseISO(d.createdAt),
                                              "dd MMM yyyy HH:mm",
                                              { locale: tr }
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                );
                              })()}

                              {(() => {
                                const scPayments = payments.filter(
                                  (p) =>
                                    p.subCustomerId === sc.id ||
                                    (typeof p.subCustomerId === "object" &&
                                      p.subCustomerId?._id === sc.id)
                                );
                                return scPayments.length === 0 ? (
                                  <div className="text-gray-400 text-sm">
                                    Ödeme yok
                                  </div>
                                ) : (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr>
                                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                          Tutar
                                        </th>
                                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                                          Ödeme Tipi
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
                                      {scPayments.map((p) => (
                                        <tr key={p._id}>
                                          <td className="text-green-600 font-semibold">
                                            {p.amount.toFixed(2)} ₺
                                          </td>
                                          <td className="text-gray-500 dark:text-gray-300">
                                            {p.paymentType === "nakit"
                                              ? "Nakit"
                                              : p.paymentType === "kredi_karti"
                                              ? "Kredi Kartı"
                                              : p.paymentType === "havale"
                                              ? "Havale"
                                              : p.paymentType === "cek"
                                              ? "Çek"
                                              : p.paymentType === "diger"
                                              ? "Diğer"
                                              : p.paymentType}
                                          </td>
                                          <td className="text-gray-500 dark:text-gray-300">
                                            {p.description || "-"}
                                          </td>
                                          <td className="text-xs text-gray-400">
                                            {format(
                                              parseISO(p.paymentDate),
                                              "dd MMM yyyy HH:mm",
                                              { locale: tr }
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                );
                              })()}
                            </div>
                          </details>
                        );
                      })
                  )}
                </div>
              </div>
            )}

            {/* Satışlar Tab'ı */}
            {activeTab === "sales" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                          Tutar
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
                          Tarih
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center text-gray-400 py-8"
                          >
                            Satış yok
                          </td>
                        </tr>
                      ) : (
                        saleItems.map((item) => (
                          <tr
                            key={item._id}
                            className="border-b border-gray-100 dark:border-gray-700"
                          >
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
                            <td className="py-2 text-gray-500 dark:text-gray-300 font-mono text-xs">
                              {item.barcode || "-"}
                            </td>
                            <td className="py-2 text-gray-500 dark:text-gray-300">
                              {item.quantity || 0}
                            </td>
                            <td className="py-2 text-gray-900 dark:text-white">
                              {item.productName || "Bilinmiyor"}
                            </td>
                            <td className="py-2 text-xs text-gray-400">
                              {format(
                                parseISO(item.createdAt),
                                "dd MMM yyyy HH:mm",
                                {
                                  locale: tr,
                                }
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Kapanmış Hesaplar Tab'ı */}
            {activeTab === "closed_accounts" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 flex-shrink-0">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
                    Kapanmış Hesaplar
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Alt müşteri ara (ad veya telefon)..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[250px]"
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
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                  {subCustomers
                    .filter((sc) => sc.status === "inactive")
                    .filter((sc) => {
                      if (!searchTerm.trim()) return true;
                      return (
                        sc.name
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()) ||
                        (sc.phone &&
                          sc.phone
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase()))
                      );
                    })
                    .map((sc) => (
                      <details
                        key={sc.id}
                        className="mb-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <summary className="cursor-pointer px-4 py-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-bold text-lg">{sc.name}</span>
                            {sc.phone && (
                              <span className="text-xs text-gray-500">
                                {sc.phone}
                              </span>
                            )}
                          </div>
                          <div className="ml-auto flex flex-col items-end gap-1">
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Tüm Borç
                                </span>
                                <span className="font-bold text-red-600">
                                  {(debts || [])
                                    .filter(
                                      (d) =>
                                        d.subCustomerId === sc.id ||
                                        (typeof d.subCustomerId === "object" &&
                                          d.subCustomerId?._id === sc.id)
                                    )
                                    .reduce(
                                      (sum: number, d: any) =>
                                        sum + (d.amount || 0),
                                      0
                                    )
                                    .toFixed(2)}{" "}
                                  ₺
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Ödenen
                                </span>
                                <span className="font-bold text-green-600">
                                  {(payments || [])
                                    .filter(
                                      (p) =>
                                        p.subCustomerId === sc.id ||
                                        (typeof p.subCustomerId === "object" &&
                                          p.subCustomerId?._id === sc.id)
                                    )
                                    .reduce(
                                      (sum: number, p: any) =>
                                        sum + (p.amount || 0),
                                      0
                                    )
                                    .toFixed(2)}{" "}
                                  ₺
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Kalan
                                </span>
                                <span className="font-bold text-red-600">
                                  {(
                                    (debts || [])
                                      .filter(
                                        (d) =>
                                          d.subCustomerId === sc.id ||
                                          (typeof d.subCustomerId ===
                                            "object" &&
                                            d.subCustomerId?._id === sc.id)
                                      )
                                      .reduce(
                                        (sum: number, d: any) =>
                                          sum + (d.amount || 0),
                                        0
                                      ) -
                                    (payments || [])
                                      .filter(
                                        (p) =>
                                          p.subCustomerId === sc.id ||
                                          (typeof p.subCustomerId ===
                                            "object" &&
                                            p.subCustomerId?._id === sc.id)
                                      )
                                      .reduce(
                                        (sum: number, p: any) =>
                                          sum + (p.amount || 0),
                                        0
                                      )
                                  ).toFixed(2)}{" "}
                                  ₺
                                </span>
                              </div>
                            </div>
                            {/* Hesap Durumu */}
                            <div className="flex items-center gap-2 mt-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  sc.status === "inactive"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                }`}
                              >
                                {sc.status === "inactive"
                                  ? "Hesap Kapalı"
                                  : "Hesap Açık"}
                              </span>
                              {sc.status === "active" && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      // Kalan borç hesapla
                                      const closeDebts = (debts || []).filter(
                                        (d) =>
                                          d.subCustomerId === sc.id ||
                                          (typeof d.subCustomerId ===
                                            "object" &&
                                            d.subCustomerId?._id === sc.id)
                                      );
                                      const closePayments = (
                                        payments || []
                                      ).filter(
                                        (p) =>
                                          p.subCustomerId === sc.id ||
                                          (typeof p.subCustomerId ===
                                            "object" &&
                                            p.subCustomerId?._id === sc.id)
                                      );
                                      const totalDebt = closeDebts.reduce(
                                        (sum: number, d: any) =>
                                          sum + (d.amount || 0),
                                        0
                                      );
                                      const totalPaid = closePayments.reduce(
                                        (sum: number, p: any) =>
                                          sum + (p.amount || 0),
                                        0
                                      );
                                      const remainingDebt =
                                        totalDebt - totalPaid;

                                      // Kalan borç varsa ödeme yap
                                      if (remainingDebt > 0) {
                                        const paymentData = {
                                          customerId: customer.id,
                                          subCustomerId: sc.id,
                                          amount: remainingDebt,
                                          description: `Hesap kapatma - Kalan borç ödemesi`,
                                          paymentDate: new Date().toISOString(),
                                          paymentType: "nakit" as const,
                                          status: "active" as const,
                                        };

                                        await customerPaymentService.create(
                                          paymentData
                                        );
                                      }

                                      // Hesabı kapat
                                      await subCustomerService.closeAccount(
                                        sc.id
                                      );

                                      // Verileri yenile
                                      const updatedPayments =
                                        await customerPaymentService.getByCustomerId(
                                          customer.id
                                        );
                                      const updatedSubCustomers =
                                        await subCustomerService.getByCustomerId(
                                          customer.id
                                        );

                                      // Debts'i yeniden yükle
                                      const closeDebtsData =
                                        await debtService.getByCustomerId(
                                          customer.id
                                        );
                                      const closeDebtsArray = Array.isArray(
                                        closeDebtsData
                                      )
                                        ? closeDebtsData
                                        : closeDebtsData.debts || [];
                                      setDebts(closeDebtsArray as any);
                                      setPayments(updatedPayments);
                                      setSubCustomers(updatedSubCustomers);

                                      console.log(
                                        "Hesap kapatıldı, yeni subCustomers:",
                                        updatedSubCustomers
                                      );

                                      alert(
                                        "Hesap kapatıldı ve kalan borç ödendi!"
                                      );
                                    } catch (error) {
                                      console.error(
                                        "Hesap kapatma hatası:",
                                        error
                                      );
                                      alert("Hesap kapatılırken hata oluştu!");
                                    }
                                  }}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                >
                                  Hesabı Kapat
                                </button>
                              )}
                            </div>
                          </div>
                        </summary>
                        <div className="px-4 pb-4">
                          {/* Borçlar */}
                          <div className="mb-3 font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            Borçlar
                          </div>
                          {(() => {
                            const scDebts = debts.filter(
                              (d) =>
                                d.subCustomerId === sc.id ||
                                (typeof d.subCustomerId === "object" &&
                                  d.subCustomerId?._id === sc.id)
                            );
                            return scDebts.length === 0 ? (
                              <div className="text-gray-400 text-sm mb-4 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                Borç yok
                              </div>
                            ) : (
                              <div className="mb-4 overflow-x-auto">
                                <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                                  <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Tutar
                                      </th>
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Ürün Kodu
                                      </th>
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Malzeme
                                      </th>
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Tarih
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {scDebts.map((d) => (
                                      <tr
                                        key={d._id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                      >
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-medium">
                                          {d.amount.toFixed(2)} ₺
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                          {(() => {
                                            if (
                                              d.saleId &&
                                              typeof d.saleId === "object" &&
                                              d.saleId.items &&
                                              Array.isArray(d.saleId.items)
                                            ) {
                                              return d.saleId.items
                                                .map((item) => item.barcode)
                                                .join(", ");
                                            }
                                            if (
                                              d.saleId &&
                                              typeof d.saleId === "object" &&
                                              d.saleId.barcode
                                            ) {
                                              return d.saleId.barcode;
                                            }
                                            return "-";
                                          })()}
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                          {(() => {
                                            if (
                                              d.saleId &&
                                              typeof d.saleId === "object" &&
                                              d.saleId.items &&
                                              Array.isArray(d.saleId.items)
                                            ) {
                                              return d.saleId.items
                                                .map(
                                                  (item) =>
                                                    `${
                                                      item.quantity || 1
                                                    } adet ${
                                                      item.productName || ""
                                                    }`
                                                )
                                                .join(", ");
                                            }
                                            return "-";
                                          })()}
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                          {format(
                                            parseISO(d.createdAt),
                                            "dd.MM.yyyy HH:mm",
                                            { locale: tr }
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                          {/* Ödemeler */}
                          <div className="mb-3 font-semibold text-gray-800 dark:text-gray-200 text-sm">
                            Yapılan Ödemeler
                          </div>
                          {(() => {
                            const scPayments = payments.filter(
                              (p) =>
                                p.subCustomerId === sc.id ||
                                (typeof p.subCustomerId === "object" &&
                                  p.subCustomerId?._id === sc.id)
                            );
                            return scPayments.length === 0 ? (
                              <div className="text-gray-400 text-sm p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                Ödeme yok
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                                  <thead>
                                    <tr className="bg-gray-100 dark:bg-gray-700">
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Tutar
                                      </th>
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Ödeme Tipi
                                      </th>
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Açıklama
                                      </th>
                                      <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                                        Tarih
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {scPayments.map((p) => (
                                      <tr
                                        key={p._id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                      >
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-medium">
                                          {p.amount.toFixed(2)} ₺
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                          {p.paymentType === "nakit"
                                            ? "Nakit"
                                            : p.paymentType === "kredi_karti"
                                            ? "Kredi Kartı"
                                            : p.paymentType === "havale"
                                            ? "Havale"
                                            : p.paymentType === "cek"
                                            ? "Çek"
                                            : p.paymentType === "diger"
                                            ? "Diğer"
                                            : p.paymentType}
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                          {p.description || "-"}
                                        </td>
                                        <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                          {format(
                                            parseISO(p.paymentDate),
                                            "dd.MM.yyyy HH:mm",
                                            { locale: tr }
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })()}
                        </div>
                      </details>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ödeme Detay Popup */}
      {paymentDetailOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ödeme Detayı
              </h3>
              <button
                onClick={() => setPaymentDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Tutar
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedPayment.amount.toFixed(2)} ₺
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Ödeme Türü
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedPayment.paymentType === "nakit" && "Nakit"}
                    {selectedPayment.paymentType === "kredi_karti" &&
                      "Kredi Kartı"}
                    {selectedPayment.paymentType === "havale" && "Havale"}
                    {selectedPayment.paymentType === "cek" && "Çek"}
                    {selectedPayment.paymentType === "diger" && "Diğer"}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Ödeme Tarihi
                </label>
                <p className="text-gray-900 dark:text-white">
                  {format(
                    parseISO(selectedPayment.paymentDate),
                    "dd MMMM yyyy HH:mm",
                    {
                      locale: tr,
                    }
                  )}
                </p>
              </div>

              {selectedPayment.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Açıklama
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedPayment.description}
                  </p>
                </div>
              )}

              {selectedPayment.receiptNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Makbuz No
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedPayment.receiptNumber}
                  </p>
                </div>
              )}

              {selectedPayment.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Notlar
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedPayment.notes}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Durum
                </label>
                <p
                  className={`font-semibold ${
                    selectedPayment.status === "active"
                      ? "text-green-600"
                      : selectedPayment.status === "cancelled"
                      ? "text-red-600"
                      : "text-orange-600"
                  }`}
                >
                  {selectedPayment.status === "active" && "Aktif"}
                  {selectedPayment.status === "cancelled" && "İptal Edildi"}
                  {selectedPayment.status === "refunded" && "İade Edildi"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SubCustomer Ekleme Modal */}
      {/* Bu modal artık kullanılmıyor, alt müşteri ekleme işlemi direkt veritabanına yapılıyor */}
    </div>
  );
};

export default CustomerDetailModal;
