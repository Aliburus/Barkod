"use client";

import React, { useState } from "react";
import { paymentService } from "../../services/paymentService";
import type { Payment } from "../../types";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, CheckCircle } from "lucide-react";
import Notification from "../Layout/Notification";

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" && e.target instanceof HTMLInputElement
          ? e.target.checked
          : value,
    }));
  };

  const calculateInstallments = () => {
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
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNotification({ message: "İsim alanı zorunlu!", type: "error" });
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
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-xs">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow mb-0 border border-gray-200 dark:border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Ödeme Ekle
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
              Firma Adı
            </label>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Firma Adı"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
              Kişi Adı
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Kişi Adı"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
              Tutar
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Tutar"
            />
          </div>
          {!form.isInstallment && (
            <div>
              <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
                Tarih
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Tarih"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500 dark:text-gray-400">
              Ödeme Türü
            </label>
            <select
              name="paymentType"
              value={form.paymentType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Seçiniz</option>
              <option value="nakit">Nakit</option>
              <option value="kredi kartı">Kredi Kartı</option>
              <option value="havale">Havale/EFT</option>
              <option value="diğer">Diğer</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            name="isInstallment"
            checked={form.isInstallment}
            onChange={handleChange}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Taksitli
          </label>
          {form.isInstallment && (
            <>
              <span className="ml-4 text-xs text-gray-500 dark:text-gray-400">
                Başlangıç Tarihi
              </span>
              <input
                type="date"
                name="installmentStart"
                value={form.installmentStart}
                onChange={handleChange}
                className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="ml-4 text-xs text-gray-500 dark:text-gray-400">
                Taksit Sayısı
              </span>
              <input
                type="number"
                name="installmentCount"
                min={2}
                max={36}
                value={form.installmentCount}
                onChange={handleChange}
                className="ml-2 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-16"
              />
            </>
          )}
        </div>
        {form.isInstallment && installments.length > 0 && (
          <div className="mt-2 bg-gray-100 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="font-semibold mb-2 text-gray-700 dark:text-gray-300 text-sm">
              Taksitler
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {installments.map((inst, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <span className="font-semibold text-primary-700 dark:text-primary-300">
                    {i + 1}. Taksit
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">
                    {inst.date}
                  </span>
                  <span className="font-bold text-success-600">
                    {inst.amount} ₺
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          type="submit"
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition-colors font-semibold text-base mt-2"
        >
          Kaydet
        </button>
      </form>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          Ödeme Listesi
        </h3>
        <div className="flex gap-4 mb-4 items-center text-xs">
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded bg-yellow-200 border border-yellow-400"></span>
            <span className="text-gray-700 dark:text-gray-300">7 gün kala</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 rounded bg-red-200 border border-red-400"></span>
            <span className="text-gray-700 dark:text-gray-300">
              3 gün kala veya geçmiş
            </span>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <ul className="space-y-3">
            {filteredPayments.map((p) => {
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
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between bg-white/80 dark:bg-gray-800/80 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group text-xs sm:text-sm ${bgClass}`}
                  onClick={() => setSelectedPayment(p)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex-1 flex flex-row flex-wrap items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[80px]">
                      {p.company}
                    </span>
                    <span className="text-gray-500 dark:text-gray-300 truncate max-w-[80px]">
                      {p.name}
                    </span>
                    <span className="font-bold text-success-700 dark:text-success-400 truncate max-w-[80px]">
                      {p.amount} ₺
                    </span>
                    <span className="text-gray-500 dark:text-gray-300 truncate max-w-[120px]">
                      {p.date
                        ? format(new Date(p.date), "dd MMMM yyyy", {
                            locale: tr,
                          })
                        : p.dueDate
                        ? format(new Date(p.dueDate), "dd MMMM yyyy", {
                            locale: tr,
                          })
                        : "-"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePaid(p);
                      }}
                      className={`ml-2 px-2 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1
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
                        <span className="text-red-600 font-bold">Ödenmedi</span>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePayment(p.id);
                    }}
                    className="ml-2 flex items-center justify-center text-red-600 hover:text-red-800 transition-colors opacity-80 group-hover:opacity-100"
                    title="Sil"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </li>
              );
            })}
          </ul>
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
    </div>
  );
};

export default PaymentsPage;
