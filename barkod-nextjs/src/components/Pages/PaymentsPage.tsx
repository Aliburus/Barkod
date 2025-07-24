"use client";

import React, { useState } from "react";

interface Payment {
  id: string;
  company: string;
  name: string;
  amount: number;
  date: string;
}

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState({
    company: "",
    name: "",
    amount: "",
    date: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() && !form.company.trim()) return;
    setPayments([
      ...payments,
      {
        id: Date.now().toString(),
        company: form.company,
        name: form.name,
        amount: parseFloat(form.amount),
        date: form.date || new Date().toISOString().split("T")[0],
      },
    ]);
    setForm({ company: "", name: "", amount: "", date: "" });
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Ödemeler
      </h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4"
      >
        <input
          name="company"
          value={form.company}
          onChange={handleChange}
          placeholder="Firma Adı"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Ad (Kişi)"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          name="amount"
          value={form.amount}
          onChange={handleChange}
          placeholder="Tutar"
          type="number"
          min="0"
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          name="date"
          value={form.date}
          onChange={handleChange}
          placeholder="Tarih"
          type="date"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
        >
          Ekle
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
