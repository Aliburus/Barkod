import React, { useEffect, useState } from "react";
import { Customer, AccountTransaction } from "../../types";
import {
  customerService,
  accountTransactionService,
} from "../../services/customerService";

const AccountTransactionsPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [transactions, setTransactions] = useState<AccountTransaction[]>([]);
  const [form, setForm] = useState({
    amount: "",
    type: "borc",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const fetchCustomers = async () => {
    const data = await customerService.getAll();
    setCustomers(data);
    if (data.length > 0 && !selectedCustomer) setSelectedCustomer(data[0].id);
  };

  const fetchTransactions = async (customerId: string) => {
    setLoading(true);
    const data = await accountTransactionService.getAll(customerId);
    setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) fetchTransactions(selectedCustomer);
  }, [selectedCustomer]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !form.amount.trim()) return;
    await accountTransactionService.create({
      customer: selectedCustomer,
      amount: parseFloat(form.amount),
      type: form.type as "borc" | "odeme",
      description: form.description,
      date: new Date().toISOString(),
    });
    setForm({ amount: "", type: "borc", description: "" });
    fetchTransactions(selectedCustomer);
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
        Cari Hareketler
      </h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Müşteri Seç
        </label>
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 space-y-4"
      >
        <div className="flex gap-2">
          <input
            name="amount"
            value={form.amount}
            onChange={handleChange}
            placeholder="Tutar"
            type="number"
            min="0"
            step="0.01"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="borc">Borç</option>
            <option value="odeme">Ödeme</option>
          </select>
        </div>
        <input
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Açıklama (isteğe bağlı)"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <button
          type="submit"
          className="w-full bg-primary-600 text-white py-2 rounded hover:bg-primary-700 transition-colors font-semibold"
          disabled={loading}
        >
          {loading ? "Kaydediliyor..." : "Hareket Ekle"}
        </button>
      </form>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div className="flex justify-between mb-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            Toplam Borç:
          </span>
          <span className="text-danger-600 font-bold">
            {totalBorc.toFixed(2)} ₺
          </span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="font-semibold text-gray-900 dark:text-white">
            Toplam Ödeme:
          </span>
          <span className="text-success-600 font-bold">
            {totalOdeme.toFixed(2)} ₺
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900 dark:text-white">
            Bakiye:
          </span>
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          Hareket Geçmişi
        </h3>
        {transactions.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Hareket yok.</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((t) => (
              <li
                key={t.id}
                className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between"
              >
                <span
                  className={
                    t.type === "borc" ? "text-danger-600" : "text-success-600"
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
    </div>
  );
};

export default AccountTransactionsPage;
