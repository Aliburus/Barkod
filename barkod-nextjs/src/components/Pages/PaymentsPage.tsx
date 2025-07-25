"use client";

import React, { useState } from "react";
import { paymentService } from "../../services/paymentService";
import type { Payment } from "../../types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, CheckCircle } from "lucide-react";
import Notification from "../Layout/Notification";
import { useEffect } from "react";
import { companyService } from "../../services/companyService";
import { Plus } from "lucide-react";
import { customerService } from "../../services/customerService";

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => {
      let next = {
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
            date: inst.date, // <-- dueDate değil, date olmalı
            amount: inst.amount,
            id: Date.now().toString() + Math.random().toString(36).slice(2),
          });
        }
      } else {
        await paymentService.create({
          ...form,
          date: form.date, // <-- dueDate değil, date olmalı
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

  const filteredPayments = payments.filter((p) => p.status !== "deleted");

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
      {/* Üstte yatay ekleme alanı */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-4 flex flex-wrap gap-4 items-center">
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap gap-2 items-end w-full"
        >
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Firma Adı
            </label>
            <div className="flex gap-2 items-center">
              <select
                name="company"
                value={form.company}
                onChange={handleChange}
                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Firma Seçiniz</option>
                {companies.map((c) => (
                  <option key={c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCompanyModal(true)}
                className="bg-primary-600 text-white px-2 py-2 rounded hover:bg-primary-700 flex items-center"
                title="Firma Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Kişi Adı
            </label>
            <div className="flex gap-2 items-center">
              <select
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Müşteri Seçiniz</option>
                {customers.map((c) => (
                  <option key={c._id || c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="bg-primary-600 text-white px-2 py-2 rounded hover:bg-primary-700 flex items-center"
                title="Müşteri Ekle"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tutar
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              placeholder="Tutar"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tarih
            </label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              placeholder="Tarih"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ödeme Türü
            </label>
            <select
              name="paymentType"
              value={form.paymentType}
              onChange={handleChange}
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Seçiniz</option>
              <option value="nakit">Nakit</option>
              <option value="kredi kartı">Kredi Kartı</option>
              <option value="havale">Havale/EFT</option>
              <option value="diğer">Diğer</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Taksit
            </label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isInstallment"
                checked={form.isInstallment}
                onChange={handleChange}
                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Taksitli
              </span>
            </div>
          </div>
          {form.isInstallment && (
            <>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Taksit Sayısı
                </label>
                <input
                  type="number"
                  name="installmentCount"
                  value={form.installmentCount}
                  onChange={handleChange}
                  min="2"
                  max="12"
                  className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  name="installmentStart"
                  value={form.installmentStart}
                  onChange={handleChange}
                  className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm flex items-center gap-2"
          >
            Kaydet
          </button>
        </form>
      </div>
      {/* Altta yatay ödeme listesi */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
        {/* Başlık */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tüm Ödemeler ({filteredPayments.length})
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-orange-700 dark:text-orange-300">
                  Bekleyen ({filteredPayments.filter((p) => !p.isPaid).length})
                </span>
              </span>
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 dark:text-green-300">
                  Yapılan ({filteredPayments.filter((p) => p.isPaid).length})
                </span>
              </span>
            </div>
          </div>
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
              {filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    Kayıtlı ödeme yok
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const today = new Date();
                  const paymentDate = p.dueDate ? new Date(p.dueDate) : null;
                  let bgClass = "";
                  let overdue = false;
                  if (paymentDate) {
                    const diffDays = Math.ceil(
                      (paymentDate.getTime() - today.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    if (diffDays < 0 && !p.isPaid) {
                      bgClass = "bg-red-100 dark:bg-red-900/20";
                      overdue = true;
                    } else if (diffDays <= 3 && !p.isPaid) {
                      bgClass = "bg-red-50 dark:bg-red-900/10";
                    } else if (diffDays <= 7 && !p.isPaid) {
                      bgClass = "bg-yellow-50 dark:bg-yellow-900/10";
                    }
                  }

                  // Ödeme durumuna göre satır rengi
                  const rowClass = p.isPaid
                    ? "bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500"
                    : "bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500";

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${bgClass} ${rowClass}`}
                    >
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-semibold">
                        {p.company}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {p.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-success-700 dark:text-success-400 font-bold">
                        {p.amount} ₺
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
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
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {p.paymentType || "-"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() => handleTogglePaid(p)}
                          className={`px-2 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1
                            ${
                              p.isPaid
                                ? "bg-green-100 text-green-700 border-green-300"
                                : overdue
                                ? "bg-red-100 text-red-700 border-red-300"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
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
              Ödeme Detayı
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
