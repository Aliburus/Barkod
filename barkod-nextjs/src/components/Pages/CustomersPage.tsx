"use client";

import React, { useEffect, useState } from "react";
import { Customer, AccountTransaction, Sale } from "../../types";
import { customerService } from "../../services/customerService";
import { accountTransactionService } from "../../services/customerService";
import { productService } from "../../services/productService";

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [trxForm, setTrxForm] = useState({
    amount: "",
    type: "borc",
    description: "",
  });
  const [trxLoading, setTrxLoading] = useState(false);
  const [trxModal, setTrxModal] = useState(false);
  // Customer tipine color eklemeden önce state ile localde tutacağım (db yoksa). Eğer db'de varsa oraya da eklenir.
  const [customerColors, setCustomerColors] = useState<{
    [id: string]: string;
  }>({});
  const [sales, setSales] = useState<Sale[]>([]);

  const fetchCustomers = async () => {
    setLoading(true);
    const data = await customerService.getAll();
    setCustomers(data);
    setLoading(false);
  };

  const fetchTransactions = async (customerId: string) => {
    setTrxLoading(true);
    const data = await accountTransactionService.getAll(customerId);
    setTransactions(data);
    setTrxLoading(false);
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

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setTrxForm({ amount: "", type: "borc", description: "" });
    setTrxModal(true);
    await fetchTransactions(customer.id);
    const allSales = await productService.getAllSales();
    setSales(allSales.filter((s) => s.customer === customer.id));
  };

  const handleTrxChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setTrxForm({ ...trxForm, [e.target.name]: e.target.value });
  };

  const handleTrxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !trxForm.amount.trim()) return;
    await accountTransactionService.create({
      customer: selectedCustomer.id,
      amount: parseFloat(trxForm.amount),
      type: trxForm.type as "borc" | "odeme",
      description: trxForm.description,
      date: new Date().toISOString(),
    });
    setTrxForm({ amount: "", type: "borc", description: "" });
    fetchTransactions(selectedCustomer.id);
  };

  const totalBorc = transactions
    .filter((t) => t.type === "borc")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalOdeme = transactions
    .filter((t) => t.type === "odeme")
    .reduce((sum, t) => sum + t.amount, 0);
  const bakiye = totalBorc - totalOdeme;

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
              <div
                key={c.id}
                className={`grid grid-cols-3 gap-2 items-center py-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors ${
                  customerColors[c.id] === "yellow"
                    ? "bg-yellow-100 dark:bg-yellow-900/20"
                    : customerColors[c.id] === "red"
                    ? "bg-red-100 dark:bg-red-900/20"
                    : customerColors[c.id] === "blue"
                    ? "bg-blue-100 dark:bg-blue-900/20"
                    : ""
                }`}
                onClick={() => openCustomerDetail(c)}
              >
                <div className="flex items-center gap-2">
                  {/* Renkli badge */}
                  {customerColors[c.id] && (
                    <span
                      className={`inline-block w-3 h-3 rounded-full border border-gray-300 mr-1 ${
                        customerColors[c.id] === "yellow"
                          ? "bg-yellow-400"
                          : customerColors[c.id] === "red"
                          ? "bg-red-500"
                          : customerColors[c.id] === "blue"
                          ? "bg-blue-500"
                          : ""
                      }`}
                    ></span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {c.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {c.phone}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {c.address}
                </span>
              </div>
            ))}
          </ul>
        )}
      </div>
      {trxModal && selectedCustomer && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setTrxModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTrxModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Kapat
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
              {/* Renkli badge */}
              {customerColors[selectedCustomer.id] && (
                <span
                  className={`inline-block w-4 h-4 rounded-full border border-gray-300 mr-1 ${
                    customerColors[selectedCustomer.id] === "yellow"
                      ? "bg-yellow-400"
                      : customerColors[selectedCustomer.id] === "red"
                      ? "bg-red-500"
                      : customerColors[selectedCustomer.id] === "blue"
                      ? "bg-blue-500"
                      : ""
                  }`}
                ></span>
              )}
              {selectedCustomer.name}
            </h2>
            <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              Telefon: {selectedCustomer.phone || "-"}
            </div>
            <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
              Adres: {selectedCustomer.address || "-"}
            </div>
            <div className="mb-4 flex gap-2 items-center">
              <span className="font-semibold">Renk:</span>
              {["yellow", "red", "blue"].map((color) => (
                <button
                  key={color}
                  onClick={() =>
                    setCustomerColors((prev) => ({
                      ...prev,
                      [selectedCustomer.id]: color,
                    }))
                  }
                  className={`w-6 h-6 rounded-full border-2 ${
                    color === "yellow"
                      ? "bg-yellow-400 border-yellow-600"
                      : color === "red"
                      ? "bg-red-400 border-red-600"
                      : "bg-blue-400 border-blue-600"
                  } ${
                    customerColors[selectedCustomer.id] === color
                      ? "ring-2 ring-black"
                      : ""
                  }`}
                  title={color}
                />
              ))}
            </div>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Toplam Borç:</span>
                <span className="text-danger-600 font-bold">
                  {totalBorc.toFixed(2)} ₺
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Toplam Ödeme:</span>
                <span className="text-success-600 font-bold">
                  {totalOdeme.toFixed(2)} ₺
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Bakiye:</span>
                <span
                  className={
                    bakiye > 0
                      ? "text-danger-600 font-bold"
                      : "text-success-600 font-bold"
                  }
                >
                  {bakiye.toFixed(2)} ₺
                </span>
              </div>
            </div>
            <form
              onSubmit={handleTrxSubmit}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-4 mb-4 space-y-2"
            >
              <div className="flex gap-2">
                <input
                  name="amount"
                  value={trxForm.amount}
                  onChange={handleTrxChange}
                  placeholder="Tutar"
                  type="number"
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                <select
                  name="type"
                  value={trxForm.type}
                  onChange={handleTrxChange}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="borc">Borç</option>
                  <option value="odeme">Ödeme</option>
                </select>
              </div>
              <input
                name="description"
                value={trxForm.description}
                onChange={handleTrxChange}
                placeholder="Açıklama (isteğe bağlı)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
                disabled={trxLoading}
              >
                {trxLoading ? "Kaydediliyor..." : "Hareket Ekle"}
              </button>
            </form>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Hareket Geçmişi
              </h3>
              {trxLoading ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Yükleniyor...
                </p>
              ) : transactions.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Hareket yok.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-48 overflow-y-auto">
                  {transactions.map((t) => (
                    <li
                      key={t.id}
                      className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span
                        className={
                          t.type === "borc"
                            ? "text-danger-600"
                            : "text-success-600"
                        }
                      >
                        {t.type === "borc" ? "Borç" : "Ödeme"}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {t.amount.toFixed(2)} ₺
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {t.description}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(t.date).toLocaleString("tr-TR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Satış geçmişi */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-4 mt-4">
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Satış Geçmişi
              </h3>
              {sales.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Satış yok.</p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-48 overflow-y-auto">
                  {sales.map((s) => (
                    <li
                      key={s.id}
                      className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">
                        {s.productName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {s.quantity} adet
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {s.paymentType || "-"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(s.soldAt).toLocaleString("tr-TR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
