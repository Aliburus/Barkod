"use client";

import React, { useEffect, useState } from "react";
import { Customer } from "../../types";
import { customerService } from "../../services/customerService";

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    const data = await customerService.getAll();
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await customerService.create(form);
    setForm({ name: "", phone: "", address: "" });
    fetchCustomers();
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        Müşteriler
      </h2>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4"
      >
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Müşteri Adı"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Telefon"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Adres"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
          disabled={loading}
        >
          {loading ? "Ekleniyor..." : "Müşteri Ekle"}
        </button>
      </form>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          Müşteri Listesi
        </h3>
        {customers.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            Kayıtlı müşteri yok.
          </p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map((c) => (
              <li
                key={c.id}
                className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {c.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300">
                  {c.phone}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300">
                  {c.address}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CustomersPage;
