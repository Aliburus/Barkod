import React, { useState } from "react";
import { Customer, Debt, CustomerPayment, SubCustomer } from "../../types";
import { customerPaymentService } from "../../services/customerPaymentService";

import { subCustomerService } from "../../services/subCustomerService";

interface PaymentFormProps {
  customer: Customer;
  debts: Debt[];
  payments: CustomerPayment[];
  subCustomers: SubCustomer[];
  debtSummary: {
    totalDebt: number;
    totalPaid: number;
    remainingDebt: number;
  };
  onPaymentSuccess: () => void;
  fetchCustomers?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  customer,
  debts,
  payments,
  subCustomers,
  debtSummary,
  onPaymentSuccess,
  fetchCustomers,
}) => {
  const [trxForm, setTrxForm] = useState({
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
  const [trxLoading, setTrxLoading] = useState(false);

  const { remainingDebt } = debtSummary;

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
          }
        }
      }

      if (fetchCustomers) fetchCustomers();
      onPaymentSuccess();
    } catch (error) {
      console.error("Ödeme işlemi hatası:", error);
      alert("Ödeme kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setTrxLoading(false);
    }
  };

  // Maksimum ödeme tutarı hesaplama
  const getMaxPaymentAmount = () => {
    let maxAmount = remainingDebt;
    if (trxForm.subCustomerId) {
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
        maxAmount = Math.max(0, subCustomerTotalDebt - subCustomerTotalPaid);
      }
    }
    return maxAmount;
  };

  const maxPaymentAmount = getMaxPaymentAmount();

  return (
    <div className="w-full px-6 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Ödeme Al
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Müşteriden ödeme almak için aşağıdaki formu kullanın.
        </p>
        {/* Maksimum ödeme tutarı bilgisi */}
        {maxPaymentAmount > 0 ? (
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
            Maksimum ödeme tutarı:{" "}
            <strong>{maxPaymentAmount.toFixed(2)} ₺</strong>
          </p>
        ) : (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            ✅ Tüm borçlar ödendi
          </p>
        )}
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
          max={maxPaymentAmount}
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
            maxPaymentAmount > 0
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-400 text-gray-600 cursor-not-allowed"
          }`}
          disabled={trxLoading || maxPaymentAmount <= 0}
        >
          {trxLoading
            ? "Kaydediliyor..."
            : maxPaymentAmount > 0
            ? "Ödeme Al"
            : "Borç Yok"}
        </button>
      </form>
    </div>
  );
};

export default PaymentForm;
