"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Customer } from "../../types";
import { customerService } from "../../services/customerService";

import {
  Trash2,
  Search,
  Plus,
  Phone,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Debounce utility function
const debounce = (func: (search: string) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(search: string) {
    const later = () => {
      clearTimeout(timeout);
      func(search);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

import CustomerDetailModal from "../../components/CustomerDetailModal";

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [form, setForm] = React.useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchCustomers = async (search?: string, page: number = 1) => {
    setLoading(true);
    const data = await customerService.getAll(search, page);
    setCustomers(data.customers);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers("", 1);
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
    fetchCustomers(searchTerm);
  };

  // Debounced search
  const debouncedSearch = useCallback(
    React.useMemo(
      () =>
        debounce((search: string) => {
          fetchCustomers(search);
        }, 300),
      []
    ),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleDeleteCustomer = async (id: string) => {
    await customerService.delete(id);
    fetchCustomers(searchTerm);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Quick Add Form */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl shadow-lg border border-blue-200 dark:border-gray-600 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hızlı Müşteri Ekleme
            </h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Form
            </span>
            {showAddForm ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-gray-200 dark:border-gray-600 pt-4"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Müşteri Adı *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Müşteri adını girin"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefon
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Telefon numarası"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adres
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Müşteri adresi"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all duration-200"
              />
            </div>
            <div className="lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Ekleniyor...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Müşteri Ekle
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Customer List Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Müşteri Listesi
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Müşteri ara..."
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-64"
                />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {customers.length} müşteri
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Müşteri Adı
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Telefon
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Adres
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {customers.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-12 text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Henüz müşteri eklenmemiş
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          İlk müşterinizi eklemek için yukarıdaki formu kullanın
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                customers &&
                Array.isArray(customers) &&
                customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => openCustomerDetail(c)}
                            className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {c.name}
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mr-3">
                          <Phone className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white font-medium">
                          {c.phone || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mr-3">
                          <MapPin className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {c.address || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-medium text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        title="Müşteriyi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                        Sil
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
