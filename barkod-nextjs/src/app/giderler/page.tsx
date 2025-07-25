"use client";
import React, { useState, useEffect } from "react";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { expenseService } from "../../services/expenseService";
import type { Expense } from "../../types/index";
import { Dialog } from "@headlessui/react";

const frequencyOptions = [
  { value: "aylık", label: "Her Ay" },
  { value: "haftalık", label: "Her Hafta" },
  { value: "günlük", label: "Her Gün" },
  { value: "tek", label: "Tek Seferlik" },
];

interface GiderlerPageProps {
  giderler: Expense[];
  setGiderler: React.Dispatch<React.SetStateAction<Expense[]>>;
}

const GiderlerPage: React.FC<GiderlerPageProps> = ({
  giderler,
  setGiderler,
}) => {
  const safeGiderler = Array.isArray(giderler) ? giderler : [];
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [frequency, setFrequency] = useState("tek");
  const [paymentDate, setPaymentDate] = useState("");
  const [selectedGider, setSelectedGider] = useState<Expense | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    expenseService.getAll().then(setGiderler);
  }, [setGiderler]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paymentDate) return;
    const yeniGider: Omit<Expense, "id" | "_id" | "status" | "createdAt"> = {
      amount: Number(amount),
      desc: desc.trim() ? desc : undefined,
      frequency: frequency,
      paymentDate,
    };
    const saved = await expenseService.create(yeniGider);
    setGiderler((prev) => [saved, ...prev]);
    setAmount("");
    setDesc("");
    setFrequency("aylık");
    setPaymentDate("");
  };

  const handleDelete = async (id: string) => {
    await expenseService.delete(id);
    setGiderler((prev) => prev.filter((g) => g.id !== id && g._id !== id));
  };

  const today = new Date().toISOString().split("T")[0];
  const aktifGiderler = safeGiderler.filter((g) => {
    if (!g.paymentDate) return true;
    return g.paymentDate >= today;
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header activeTab="giderler" lowStockCount={0} onAddProduct={() => {}} />
      <Navigation activeTab="giderler" onTabChange={() => {}} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Gider Ekle
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Sol: Ekleme Formu */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">
                Tutar <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 text-gray-900 dark:text-white outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={0}
                placeholder="Tutar giriniz"
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">
                Açıklama
              </label>
              <textarea
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 text-gray-900 dark:text-white outline-none resize-none"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Açıklama (opsiyonel)"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">
                Tekrar Sıklığı
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 text-gray-900 dark:text-white outline-none"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">
                Ödeme Tarihi <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 text-gray-900 dark:text-white outline-none"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              disabled={!amount || !paymentDate}
            >
              Kaydet
            </button>
          </form>
          {/* Sağ: Liste */}
          <div className="flex flex-col h-[400px] md:h-auto max-h-[60vh] bg-gray-50 dark:bg-gray-900 rounded-lg shadow-inner overflow-y-auto p-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Giderler Listesi
            </h2>
            {aktifGiderler.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400">
                Henüz gider eklenmedi.
              </div>
            ) : (
              <ul className="space-y-2">
                {aktifGiderler.map((gider) => (
                  <li
                    key={gider.id || gider._id || Math.random()}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-6 py-3 shadow hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700"
                    onClick={() => {
                      setSelectedGider(gider);
                      setShowDetail(true);
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold text-blue-700 dark:text-blue-300 text-lg">
                        ₺{gider.amount}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {gider.frequency ? `Sıklık: ${gider.frequency}` : ""}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {gider.paymentDate
                          ? `Ödeme Tarihi: ${new Date(
                              gider.paymentDate
                            ).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}`
                          : ""}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(gider.id || gider._id || "");
                      }}
                      className="ml-4 px-2 py-1 rounded bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Sil
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
      {/* Gider Detay Modalı */}
      <Dialog
        open={showDetail}
        onClose={() => setShowDetail(false)}
        className="fixed z-50 inset-0 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="fixed inset-0 bg-black bg-opacity-40" />
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full mx-auto p-6 z-10">
            <Dialog.Title className="text-lg font-bold mb-2 text-gray-900 dark:text-white">
              Gider Detayı
            </Dialog.Title>
            {selectedGider && (
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Tutar:</span> ₺
                  {selectedGider.amount}
                </div>
                <div>
                  <span className="font-semibold">Açıklama:</span>{" "}
                  {selectedGider.desc || "-"}
                </div>
                <div>
                  <span className="font-semibold">Tekrar Sıklığı:</span>{" "}
                  {selectedGider.frequency || "-"}
                </div>
                <div>
                  <span className="font-semibold">Ödeme Tarihi:</span>{" "}
                  {selectedGider.paymentDate
                    ? new Date(selectedGider.paymentDate).toLocaleDateString(
                        "tr-TR",
                        { year: "numeric", month: "long", day: "numeric" }
                      )
                    : "-"}
                </div>
                <div>
                  <span className="font-semibold">Durum:</span>{" "}
                  {selectedGider.status || "-"}
                </div>
                <div>
                  <span className="font-semibold">Oluşturulma:</span>{" "}
                  {selectedGider.createdAt
                    ? new Date(selectedGider.createdAt).toLocaleString(
                        "tr-TR",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )
                    : "-"}
                </div>
              </div>
            )}
            <button
              className="mt-6 w-full py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              onClick={() => setShowDetail(false)}
            >
              Kapat
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default function Page() {
  const [giderler, setGiderler] = useState<Expense[]>([]);
  return <GiderlerPage giderler={giderler} setGiderler={setGiderler} />;
}
