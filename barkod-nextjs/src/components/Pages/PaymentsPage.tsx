"use client";

import React, { useState, useEffect } from "react";
import { paymentService } from "../../services/paymentService";
import { Payment, Debt } from "../../types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, CheckCircle } from "lucide-react";
import Notification from "../Layout/Notification";
import { companyService } from "../../services/companyService";
import { Plus } from "lucide-react";
import { customerService } from "../../services/customerService";
import { debtService } from "../../services/debtService";
import { Sale, SaleItem } from "../../types";

interface PaymentForm {
  company: string;
  name: string;
  amount: string;
  date: string;
  isInstallment: boolean;
  installmentCount: number;
  installmentStart: string;
  paymentType: string;
}

interface Company {
  _id: string;
  name: string;
}

interface Customer {
  id: string;
  _id?: string;
  name: string;
}

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState<PaymentForm>({
    company: "",
    name: "",
    amount: "",
    date: "",
    isInstallment: false,
    installmentCount: 2,
    installmentStart: "",
    paymentType: "",
  });
  const [installments, setInstallments] = useState<
    { date: string; amount: number }[]
  >([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [activeTab, setActiveTab] = useState<"alacak" | "verecek">("alacak");
  const [debts, setDebts] = useState<Debt[]>([]);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [showDebtModal, setShowDebtModal] = useState(false);

  useEffect(() => {
    if (showDebtModal && selectedDebt) {
      console.log("saleId:", selectedDebt.saleId);
    }
  }, [showDebtModal, selectedDebt]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => {
      const next = {
        ...prev,
        [name]:
          type === "checkbox" && e.target instanceof HTMLInputElement
            ? e.target.checked
            : value,
      };
      if (name === "company" && value) {
        next.name = "";
      }
      if (name === "name" && value) {
        next.company = "";
      }
      return next;
    });
  };

  const calculateInstallments = React.useCallback(() => {
    if (
      !form.isInstallment ||
      !form.installmentStart ||
      !form.installmentCount ||
      !form.amount
    ) {
      setInstallments([]);
      return;
    }
    const count = form.installmentCount || 0;
    const total = parseFloat(form.amount) || 0;
    if (count < 1 || total <= 0) {
      setInstallments([]);
      return;
    }
    const perAmount = Math.round((total / count) * 100) / 100;
    const startDate = new Date(form.installmentStart);
    const list = Array.from({ length: count }).map((_, i) => {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      return {
        date: d.toISOString().slice(0, 10),
        amount: perAmount,
      };
    });
    setInstallments(list);
  }, [
    form.isInstallment,
    form.installmentCount,
    form.installmentStart,
    form.amount,
  ]);

  // Taksitli alanları değişince otomatik hesapla
  React.useEffect(() => {
    calculateInstallments();
  }, [
    form.isInstallment,
    form.installmentCount,
    form.installmentStart,
    form.amount,
    calculateInstallments,
  ]);

  React.useEffect(() => {
    debtService.getAll().then((data) => {
      setDebts(
        data.map((debt) => ({
          ...debt,
          createdAt: debt.createdAt?.toString() ?? "",
          updatedAt: debt.updatedAt?.toString() ?? "",
          dueDate: debt.dueDate?.toString() ?? undefined,
        })) as Debt[]
      );
    });
    paymentService.getAll().then((data: Payment[]) => {
      setPayments(
        data.map((p, i) => {
          const id =
            p.id ||
            (typeof p._id === "string" ? p._id : undefined) ||
            String(i);
          return { ...p, id };
        })
      );
    });
  }, []);

  useEffect(() => {
    companyService.getAll().then(setCompanies);
  }, []);

  useEffect(() => {
    customerService.getAll().then(setCustomers);
  }, []);

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim()) return;
    await companyService.create(newCompany);
    setShowCompanyModal(false);
    setNewCompany({ name: "", phone: "", address: "" });
    companyService.getAll().then(setCompanies);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;
    await customerService.create(newCustomer);
    setShowCustomerModal(false);
    setNewCustomer({ name: "", phone: "", address: "" });
    customerService.getAll().then(setCustomers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.company.trim()) {
      setNotification({
        message: "Firma adı veya müşteri adı zorunlu!",
        type: "error",
      });
      return;
    }
    if (
      !form.amount ||
      isNaN(Number(form.amount)) ||
      Number(form.amount) <= 0
    ) {
      setNotification({
        message: "Tutar alanı zorunlu ve pozitif sayı olmalı!",
        type: "error",
      });
      return;
    }
    if (!form.isInstallment && !form.date) {
      setNotification({ message: "Tarih alanı zorunlu!", type: "error" });
      return;
    }
    if (!form.paymentType) {
      setNotification({ message: "Ödeme türü seçmelisiniz!", type: "error" });
      return;
    }
    try {
      if (form.isInstallment && installments.length > 0) {
        for (const inst of installments) {
          await paymentService.create({
            ...form,
            date: inst.date,
            amount: inst.amount,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
          });
        }
      } else {
        await paymentService.create({
          ...form,
          date: form.date,
          amount: parseFloat(form.amount),
          id: Date.now().toString() + Math.random().toString(36).slice(2),
        });
      }
      paymentService.getAll().then((data: Payment[]) => {
        setPayments(
          data.map((p, i) => {
            const id =
              p.id ||
              (typeof p._id === "string" ? p._id : undefined) ||
              String(i);
            return { ...p, id };
          })
        );
      });
      setNotification({ message: "Ödeme başarıyla eklendi", type: "success" });
      setForm({
        company: "",
        name: "",
        amount: "",
        date: "",
        isInstallment: false,
        installmentCount: 2,
        installmentStart: "",
        paymentType: "",
      });
      setInstallments([]);
    } catch (error: unknown) {
      let msg = "Ödeme eklenirken hata oluştu";
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === "string"
      ) {
        const errMsg = (
          error as { response: { data: { error: string } } }
        ).response.data.error.toLowerCase();
        if (errMsg.includes("date required")) {
          msg = "Ödeme tarihi zorunlu!";
        } else if (errMsg.includes("validation failed")) {
          msg =
            "Ödeme bilgileri eksik veya hatalı, lütfen tüm alanları kontrol edin!";
        } else {
          msg = (error as { response: { data: { error: string } } }).response
            .data.error;
        }
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: string }).message === "string"
      ) {
        msg = (error as { message: string }).message;
      }
      setNotification({ message: msg, type: "error" });
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await paymentService.delete(id);
    } catch (err: unknown) {
      let responseStatus: number | undefined = undefined;
      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { status?: number } }).response?.status ===
          "number"
      ) {
        responseStatus = (err as { response: { status: number } }).response
          .status;
      }
      if (responseStatus !== 404) {
        console.error(err);
      }
    }
    const data = await paymentService.getAll();
    setPayments(
      data.map((p, i) => {
        const id =
          p.id || (typeof p._id === "string" ? p._id : undefined) || String(i);
        return { ...p, id };
      })
    );
  };

  const handleTogglePaid = async (payment: Payment) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === payment.id ? { ...p, isPaid: !p.isPaid } : p))
    );
    await paymentService.update(payment.id, { isPaid: !payment.isPaid });
    const data = await paymentService.getAll();
    setPayments(
      data.map((p, i) => {
        const id =
          p.id || (typeof p._id === "string" ? p._id : undefined) || String(i);
        return { ...p, id };
      })
    );
  };

  const handleDebtClick = (debt: Debt) => {
    setSelectedDebt(debt);
    setShowDebtModal(true);
  };

  const handlePaymentClick = (payment: Payment) => {
    setSelectedPayment(payment);
  };

  // Alacaklar: borçlardan ödenmemişler
  const receivables = debts.filter((d) => !d.isPaid);
  // Verecekler: paymentlardan ödenmemişler
  const payables = payments.filter((p) => p.status !== "deleted" && !p.isPaid);

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-xs">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      {/* Sekmeler */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
            activeTab === "alacak"
              ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
              : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
          }`}
          onClick={() => setActiveTab("alacak")}
        >
          Alacaklar
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
            activeTab === "verecek"
              ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
              : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
          }`}
          onClick={() => setActiveTab("verecek")}
        >
          Verecekler
        </button>
      </div>
      {/* Tablo */}
      {activeTab === "alacak" ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tüm Alacaklar ({receivables.length})
            </h3>
          </div>
          <div className="overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Müşteri
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Açıklama
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Tutar
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Oluşturulma
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Vade
                  </th>
                </tr>
              </thead>
              <tbody>
                {receivables.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-gray-500 dark:text-gray-400"
                    >
                      Alacak yok
                    </td>
                  </tr>
                ) : (
                  receivables.map((d) => (
                    <tr
                      key={d._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => handleDebtClick(d)}
                    >
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-semibold">
                        {typeof d.customerId === "object" &&
                        d.customerId !== null &&
                        (d.customerId as Customer).name
                          ? (d.customerId as Customer).name
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {d.description}
                      </td>
                      <td className="px-4 py-2 text-sm text-success-700 dark:text-success-400 font-bold">
                        {d.amount} ₺
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {d.createdAt
                          ? format(new Date(d.createdAt), "dd MMMM yyyy", {
                              locale: tr,
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {d.dueDate
                          ? format(new Date(d.dueDate), "dd MMMM yyyy", {
                              locale: tr,
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {/* Verecek Ekleme Formu */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Yeni Verecek Ekle
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Firma/Kişi Seçimi */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Firma/Kişi Seçimi
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Firma Seç</option>
                      {companies.map((company) => (
                        <option key={company._id} value={company.name}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCompanyModal(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <select
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Kişi Seç</option>
                      {customers.map((customer) => (
                        <option
                          key={customer.id || customer._id}
                          value={customer.name}
                        >
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(true)}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Tutar ve Tarih */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tutar (₺)
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tarih
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={form.date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Ödeme Türü */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ödeme Türü
                </label>
                <select
                  name="paymentType"
                  value={form.paymentType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Ödeme Türü Seç</option>
                  <option value="Nakit">Nakit</option>
                  <option value="Kredi Kartı">Kredi Kartı</option>
                  <option value="Banka Transferi">Banka Transferi</option>
                  <option value="Çek">Çek</option>
                  <option value="Senet">Senet</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              {/* Taksit Seçimi */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isInstallment"
                    checked={form.isInstallment}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Taksitli Ödeme
                  </label>
                </div>

                {form.isInstallment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Taksit Sayısı
                      </label>
                      <input
                        type="number"
                        name="installmentCount"
                        value={form.installmentCount}
                        onChange={handleChange}
                        min="2"
                        max="12"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        İlk Taksit Tarihi
                      </label>
                      <input
                        type="date"
                        name="installmentStart"
                        value={form.installmentStart}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/* Taksit Listesi */}
                {form.isInstallment && installments.length > 0 && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Taksit Planı
                    </h4>
                    <div className="space-y-2">
                      {installments.map((installment, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center text-sm"
                        >
                          <span className="text-gray-600 dark:text-gray-400">
                            {index + 1}. Taksit - {installment.date}
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {installment.amount.toFixed(2)} ₺
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gönder Butonu */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition-colors font-semibold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Verecek Ekle
                </button>
              </div>
            </form>
          </div>

          {/* Verecekler Tablosu */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tüm Verecekler ({payables.length})
              </h3>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Firma
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Kişi
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Tutar
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Tarih
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Ödeme Türü
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Durum
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payables.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-gray-500 dark:text-gray-400"
                      >
                        Verecek yok
                      </td>
                    </tr>
                  ) : (
                    payables.map((p) => (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <td
                          className="px-4 py-2 text-sm text-gray-900 dark:text-white font-semibold cursor-pointer"
                          onClick={() => handlePaymentClick(p)}
                        >
                          {p.company}
                        </td>
                        <td
                          className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300 cursor-pointer"
                          onClick={() => handlePaymentClick(p)}
                        >
                          {p.name}
                        </td>
                        <td
                          className="px-4 py-2 text-sm text-success-700 dark:text-success-400 font-bold cursor-pointer"
                          onClick={() => handlePaymentClick(p)}
                        >
                          {p.amount} ₺
                        </td>
                        <td
                          className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300 cursor-pointer"
                          onClick={() => handlePaymentClick(p)}
                        >
                          {p.date
                            ? format(new Date(p.date), "dd MMMM yyyy", {
                                locale: tr,
                              })
                            : p.dueDate
                            ? format(new Date(p.dueDate), "dd MMMM yyyy", {
                                locale: tr,
                              })
                            : "-"}
                        </td>
                        <td
                          className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300 cursor-pointer"
                          onClick={() => handlePaymentClick(p)}
                        >
                          {p.paymentType || "-"}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => handleTogglePaid(p)}
                            className={`px-2 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1
                            ${
                              p.isPaid
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-gray-100 text-gray-500 border-gray-300 hover:bg-green-50 hover:text-green-700"
                            }`}
                            title="Ödendi olarak işaretle"
                          >
                            {p.isPaid ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Ödendi
                              </>
                            ) : (
                              <span className="text-red-600 font-bold">
                                Ödenmedi
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" /> Sil
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {/* Borç Detay Modalı */}
      {showDebtModal && selectedDebt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg p-3 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDebtModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Alacak Detayı
            </h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Müşteri:</span>{" "}
                {typeof selectedDebt.customerId === "object" &&
                selectedDebt.customerId !== null &&
                (selectedDebt.customerId as Customer).name
                  ? (selectedDebt.customerId as Customer).name
                  : "-"}
              </div>
              <div>
                <span className="font-semibold">Açıklama:</span>{" "}
                {selectedDebt.description}
              </div>
              <div>
                <span className="font-semibold">Tutar:</span>{" "}
                {selectedDebt.amount} ₺
              </div>
              <div>
                <span className="font-semibold">Oluşturulma:</span>{" "}
                {selectedDebt.createdAt
                  ? format(new Date(selectedDebt.createdAt), "dd.MM.yyyy HH:mm")
                  : "-"}
              </div>
              <div>
                <span className="font-semibold">Vade:</span>{" "}
                {selectedDebt.dueDate
                  ? format(new Date(selectedDebt.dueDate), "dd.MM.yyyy")
                  : "-"}
              </div>
              <div>
                <span className="font-semibold">Durum:</span>{" "}
                {selectedDebt.isPaid ? "Ödendi" : "Ödenmedi"}
              </div>
              {(selectedDebt.paidAmount || 0) > 0 && (
                <div>
                  <span className="font-semibold">Ödenen Tutar:</span>{" "}
                  <span className="text-green-600 font-semibold">
                    {(selectedDebt.paidAmount || 0).toFixed(2)} ₺
                  </span>
                </div>
              )}

              {/* Ürün Detayları - Satış borçları için */}
              {selectedDebt.saleId && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Satış Detayları
                  </h3>

                  {selectedDebt.saleId &&
                  typeof selectedDebt.saleId === "object" &&
                  (selectedDebt.saleId as Sale)?.items !== undefined &&
                  Array.isArray((selectedDebt.saleId as Sale)?.items) &&
                  ((selectedDebt.saleId as Sale)?.items?.length ?? 0) > 0 ? (
                    <div className="space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-600">
                              <th className="text-left py-1 pr-2 font-medium text-gray-700 dark:text-gray-300">
                                Ürün
                              </th>
                              <th className="text-left py-1 pr-2 font-medium text-gray-700 dark:text-gray-300">
                                Adet
                              </th>
                              <th className="text-left py-1 pr-2 font-medium text-gray-700 dark:text-gray-300">
                                Birim Fiyat
                              </th>
                              <th className="text-left py-1 pr-2 font-medium text-gray-700 dark:text-gray-300">
                                Toplam
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedDebt.saleId as Sale)?.items?.map(
                              (item: SaleItem, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-b border-gray-100 dark:border-gray-700"
                                >
                                  <td className="py-1 pr-2 font-medium text-gray-900 dark:text-white">
                                    {item.productName || "-"}
                                  </td>
                                  <td className="py-1 pr-2 text-gray-600 dark:text-gray-400">
                                    {item.quantity || 0} adet
                                  </td>
                                  <td className="py-1 pr-2 text-gray-600 dark:text-gray-400">
                                    {item.price?.toFixed(2) || "0.00"} ₺
                                  </td>
                                  <td className="py-1 pr-2 font-semibold text-gray-900 dark:text-white">
                                    {(
                                      (item.price || 0) * (item.quantity || 0)
                                    ).toFixed(2)}{" "}
                                    ₺
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Toplam Tutar:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {(
                              selectedDebt.saleId as Sale
                            )?.totalAmount?.toFixed(2) || "0.00"}{" "}
                            ₺
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Ödeme Detay Modalı */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg p-3 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedPayment(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Verecek Detayı
            </h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Firma:</span>{" "}
                {selectedPayment.company}
              </div>
              <div>
                <span className="font-semibold">Kişi:</span>{" "}
                {selectedPayment.name}
              </div>
              <div>
                <span className="font-semibold">Tutar:</span>{" "}
                {selectedPayment.amount} ₺
              </div>
              <div>
                <span className="font-semibold">Tarih:</span>{" "}
                {selectedPayment.date
                  ? format(new Date(selectedPayment.date), "dd.MM.yyyy")
                  : selectedPayment.dueDate
                  ? format(new Date(selectedPayment.dueDate), "dd.MM.yyyy")
                  : "-"}
              </div>
              <div>
                <span className="font-semibold">Ödeme Türü:</span>{" "}
                {selectedPayment.paymentType || "-"}
              </div>
              <div>
                <span className="font-semibold">Durum:</span>{" "}
                {selectedPayment.isPaid ? "Ödendi" : "Ödenmedi"}
              </div>
            </div>
          </div>
        </div>
      )}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCompanyModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Firma Ekle
            </h2>
            <form onSubmit={handleAddCompany} className="space-y-3">
              <input
                name="name"
                value={newCompany.name}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, name: e.target.value })
                }
                placeholder="Firma Adı"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input
                name="phone"
                value={newCompany.phone}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, phone: e.target.value })
                }
                placeholder="Telefon"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                name="address"
                value={newCompany.address}
                onChange={(e) =>
                  setNewCompany({ ...newCompany, address: e.target.value })
                }
                placeholder="Adres"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
              >
                Ekle
              </button>
            </form>
          </div>
        </div>
      )}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Müşteri Ekle
            </h2>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <input
                name="name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                placeholder="Müşteri Adı"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              <input
                name="phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                placeholder="Telefon"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                name="address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
                placeholder="Adres"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
              >
                Ekle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsPage;
