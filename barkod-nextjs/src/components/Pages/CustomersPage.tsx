"use client";

import React, { useEffect, useState } from "react";
import { Customer } from "../../types";
import { customerService } from "../../services/customerService";

import { Trash2 } from "lucide-react";

import CustomerDetailModal from "../CustomerDetailModal";

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [form, setForm] = React.useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const fetchCustomers = async () => {
    setLoading(true);
    const data = await customerService.getAll();
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);
  // Müşteri renklerini db'den çek
  useEffect(() => {
    const colorMap: { [id: string]: string } = {};
    customers.forEach((c) => {
      if (c.color) colorMap[c.id] = c.color;
    });
  }, [customers]);

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

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleDeleteCustomer = async (id: string) => {
    await customerService.delete(id);
    fetchCustomers();
  };

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
      {/* Üstte yatay ekleme alanı */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-4 flex flex-wrap gap-4 items-center">
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap gap-2 items-end w-full"
        >
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Müşteri Adı
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Müşteri Adı"
              className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              required
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Telefon
            </label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Telefon"
              className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex flex-col flex-1 min-w-[120px]">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Adres
            </label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Adres"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button
            type="submit"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm flex items-center gap-2"
            disabled={loading}
          >
            {loading ? "Ekleniyor..." : "Müşteri Ekle"}
          </button>
        </form>
      </div>
      {/* Altta yatay müşteri listesi */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Adı
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Telefon
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Adres
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    Kayıtlı müşteri yok
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td
                      className="px-4 py-2 text-sm text-primary-600 underline cursor-pointer font-semibold"
                      onClick={() => openCustomerDetail(c)}
                    >
                      {c.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                      {c.phone || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                      {c.address || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
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
      {selectedCustomer && (
        <CustomerDetailModal
          open={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          fetchCustomers={fetchCustomers}
        />
      )}
    </div>
  );
};

export default CustomersPage;
