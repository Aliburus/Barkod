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
  const [selectedGider] = useState<Expense | null>(null);
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
      <Header activeTab="giderler" onAddProduct={() => {}} />
      <Navigation activeTab="giderler" onTabChange={() => {}} />
      <main className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
        {/* Üstte yatay ekleme alanı */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-4 flex flex-wrap gap-4 items-center">
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-2 items-end w-full"
          >
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tutar *
              </label>
              <input
                type="number"
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={0}
                placeholder="Tutar"
              />
            </div>
            <div className="flex flex-col flex-1 min-w-[120px]">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Açıklama
              </label>
              <input
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Açıklama (opsiyonel)"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tekrar Sıklığı
              </label>
              <select
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ödeme Tarihi *
              </label>
              <input
                type="date"
                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm flex items-center gap-2"
              disabled={!amount || !paymentDate}
            >
              Kaydet
            </button>
          </form>
        </div>
        {/* Altta yatay gider listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Açıklama
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Tutar
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Sıklık
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Ödeme Tarihi
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {aktifGiderler.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-gray-500 dark:text-gray-400"
                    >
                      Henüz gider eklenmedi.
                    </td>
                  </tr>
                ) : (
                  aktifGiderler.map((gider) => (
                    <tr
                      key={gider.id || gider._id || Math.random()}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-semibold">
                        {gider.desc || "Gider"}
                      </td>
                      <td className="px-4 py-2 text-sm text-blue-700 dark:text-blue-300 font-bold">
                        ₺{gider.amount}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {gider.frequency || "-"}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {gider.paymentDate
                          ? new Date(gider.paymentDate).toLocaleDateString(
                              "tr-TR",
                              { year: "numeric", month: "long", day: "numeric" }
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() =>
                            handleDelete(gider.id || gider._id || "")
                          }
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                          title="Sil"
                        >
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
