"use client";

import React, { useState } from "react";
import { paymentService } from "../../services/paymentService";
import { Payment } from "../../types";

interface PaymentForm {
  company: string;
  name: string;
  amount: string;
  date: string;
  isInstallment: boolean;
  installmentCount: number;
  installmentStart: string;
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
  });
  const [installments, setInstallments] = useState<
    { date: string; amount: number }[]
  >([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "installmentCount"
          ? Number(value)
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
    // eslint-disable-next-line
  }, [
    form.isInstallment,
    form.installmentCount,
    form.installmentStart,
    form.amount,
  ]);

  React.useEffect(() => {
    paymentService.getAll().then((data: Payment[]) => {
      setPayments(
        data.map((p, i) => ({ ...p, id: p.id || (p as any)._id || String(i) }))
      );
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.isInstallment && installments.length > 0) {
      for (const inst of installments) {
        await paymentService.create({
          ...form,
          date: inst.date,
          amount: inst.amount,
          isInstallment: true,
          id: Date.now().toString() + Math.random().toString(36).slice(2),
        });
      }
      paymentService.getAll().then((data: Payment[]) => {
        setPayments(
          data.map((p, i) => ({
            ...p,
            id: p.id || (p as any)._id || String(i),
          }))
        );
      });
    } else {
      await paymentService.create({
        ...form,
        amount: parseFloat(form.amount),
        isInstallment: false,
        id: Date.now().toString() + Math.random().toString(36).slice(2),
      });
      paymentService.getAll().then((data: Payment[]) => {
        setPayments(
          data.map((p, i) => ({
            ...p,
            id: p.id || (p as any)._id || String(i),
          }))
        );
      });
    }
    setForm({
      company: "",
      name: "",
      amount: "",
      date: "",
      isInstallment: false,
      installmentCount: 2,
      installmentStart: "",
    });
    setInstallments([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Ödemeler
      </h2>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Firma Adı</label>
            <input
              name="company"
              value={form.company}
              onChange={handleChange}
              className="w-full p-2 rounded border dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kişi Adı</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full p-2 rounded border dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tutar</label>
            <input
              name="amount"
              type="number"
              value={form.amount}
              onChange={handleChange}
              className="w-full p-2 rounded border dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tarih</label>
            <input
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              className="w-full p-2 rounded border dark:bg-gray-900"
              disabled={form.isInstallment}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isInstallment"
              checked={form.isInstallment}
              onChange={handleChange}
            />
            Taksitli
          </label>
          {form.isInstallment && (
            <>
              <label className="flex items-center gap-2">
                Başlangıç Tarihi
                <input
                  type="date"
                  name="installmentStart"
                  value={form.installmentStart}
                  onChange={handleChange}
                  className="p-1 rounded border dark:bg-gray-900"
                />
              </label>
              <label className="flex items-center gap-2">
                Taksit Sayısı
                <input
                  type="number"
                  name="installmentCount"
                  min={2}
                  max={36}
                  value={form.installmentCount}
                  onChange={handleChange}
                  className="p-1 rounded border dark:bg-gray-900 w-16"
                />
              </label>
            </>
          )}
        </div>
        {form.isInstallment && installments.length > 0 && (
          <div className="mt-2 bg-gray-100 dark:bg-gray-900 p-2 rounded">
            <div className="font-medium mb-1">Taksitler:</div>
            <ul className="text-sm grid grid-cols-2 gap-2">
              {installments.map((inst, i) => (
                <li key={i} className="flex justify-between">
                  <span>{i + 1}. Taksit</span>
                  <span>
                    {inst.date} - {inst.amount} ₺
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors font-medium w-full"
        >
          Kaydet
        </button>
      </form>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          Ödeme Listesi
        </h3>
        {payments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Kayıtlı ödeme yok.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {payments.map((p) => (
              <li
                key={p.id}
                className="py-2 grid grid-cols-4 gap-2 items-center"
              >
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {p.company}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300 truncate">
                  {p.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300 truncate">
                  {p.amount} ₺
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300 truncate text-right">
                  {p.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PaymentsPage;
