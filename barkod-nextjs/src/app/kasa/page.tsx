"use client";
import React, { useState, useEffect } from "react";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { Sale } from "../../types";
import { format } from "date-fns";
import useSWR from "swr";

interface KasaRow {
  date: string;
  nakit: number;
  krediKarti: number;
  havale: number;
  diger: number;
  pos: number;
  tahsilat: number;
  harcama: number;
  banka: number;
  oncekiKasa: number;
  gunSonuKasa: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const KasaPage: React.FC = () => {
  const { data: sales = [], error, isLoading } = useSWR("/api/sales", fetcher);
  const todayStr = new Date().toISOString().split("T")[0];
  const [manualTahsilat, setManualTahsilat] = useState(0);
  const [manualHarcama, setManualHarcama] = useState(0);
  const [manualBanka, setManualBanka] = useState(0);
  const [tahsilatDesc, setTahsilatDesc] = useState("");
  const [harcamaDesc, setHarcamaDesc] = useState("");
  const [bankaDesc, setBankaDesc] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [editTahsilat, setEditTahsilat] = useState(false);
  const [editHarcama, setEditHarcama] = useState(false);
  const [editBanka, setEditBanka] = useState(false);
  const [tahsilatDraft, setTahsilatDraft] = useState(0);
  const [harcamaDraft, setHarcamaDraft] = useState(0);
  const [bankaDraft, setBankaDraft] = useState(0);
  const [tahsilatDescDraft, setTahsilatDescDraft] = useState("");
  const [harcamaDescDraft, setHarcamaDescDraft] = useState("");
  const [bankaDescDraft, setBankaDescDraft] = useState("");

  useEffect(() => {
    fetch(`/api/kasa?date=${todayStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.date) {
          setManualTahsilat(data.tahsilat || 0);
          setManualHarcama(data.harcama || 0);
          setManualBanka(data.banka || 0);
          setTahsilatDesc(data.tahsilatDesc || "");
          setHarcamaDesc(data.harcamaDesc || "");
          setBankaDesc(data.bankaDesc || "");
          setTahsilatDraft(data.tahsilat || 0);
          setHarcamaDraft(data.harcama || 0);
          setBankaDraft(data.banka || 0);
          setTahsilatDescDraft(data.tahsilatDesc || "");
          setHarcamaDescDraft(data.harcamaDesc || "");
          setBankaDescDraft(data.bankaDesc || "");
        }
      });
  }, [todayStr]);

  if (error) return <div className="text-red-500">Veri hatası oluştu</div>;
  if (isLoading) return <div className="text-gray-500">Yükleniyor...</div>;
  console.log("KasaPage sales:", sales);
  // Satışları güne göre grupla (00:00-23:59)
  const grouped: Record<string, Sale[]> = {};
  sales.forEach((sale: Sale) => {
    const date = sale.soldAt.split("T")[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(sale);
  });
  // Tarih sıralı dizi
  const dates = Object.keys(grouped).sort();

  // Önceki günlerin kasa değerlerini hesapla
  const previousDaysKasa: Record<string, number> = {};
  let runningKasa = 0;

  dates.forEach((date) => {
    const daySales = grouped[date];
    const nakit = daySales
      .filter((s) => (s.paymentType || "").trim().toLowerCase() === "nakit")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const krediKarti = daySales
      .filter(
        (s) => (s.paymentType || "").trim().toLowerCase() === "kredi kartı"
      )
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const havale = daySales
      .filter((s) => (s.paymentType || "").trim().toLowerCase() === "havale")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const diger = daySales
      .filter((s) => (s.paymentType || "").trim().toLowerCase() === "diğer")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Günlük toplam satış
    const dailySales = nakit + krediKarti + havale + diger;
    runningKasa += dailySales;
    previousDaysKasa[date] = runningKasa;
  });

  const rows: KasaRow[] = dates.map((date, index) => {
    const daySales = grouped[date];
    const nakit = daySales
      .filter((s) => (s.paymentType || "").trim().toLowerCase() === "nakit")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const krediKarti = daySales
      .filter(
        (s) => (s.paymentType || "").trim().toLowerCase() === "kredi kartı"
      )
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const havale = daySales
      .filter((s) => (s.paymentType || "").trim().toLowerCase() === "havale")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const diger = daySales
      .filter((s) => (s.paymentType || "").trim().toLowerCase() === "diğer")
      .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    // Tahsilat, harcama, banka değerleri elle giriliyor, sadece son gün için uygulanacak
    const tahsilat = date === dates[dates.length - 1] ? manualTahsilat || 0 : 0;
    const harcama = date === dates[dates.length - 1] ? manualHarcama || 0 : 0;
    const banka = date === dates[dates.length - 1] ? manualBanka || 0 : 0;

    // Önceki günün kasa değeri
    const oncekiKasa = index > 0 ? previousDaysKasa[dates[index - 1]] : 0;

    // Günlük toplam satış (tüm ödeme türleri)
    const gunlukToplamSatis = nakit + krediKarti + havale + diger;

    // Gün sonu kasa: sadece o günün satışları + tahsilat - (harcama + banka)
    const gunSonuKasa = gunlukToplamSatis + tahsilat - (harcama + banka);
    const row: KasaRow = {
      date,
      nakit,
      krediKarti,
      havale,
      diger,
      pos: 0,
      tahsilat,
      harcama,
      banka,
      oncekiKasa,
      gunSonuKasa,
    };
    return row;
  });
  const last: KasaRow =
    rows.length > 0
      ? rows[rows.length - 1]
      : {
          date: "",
          nakit: 0,
          krediKarti: 0,
          havale: 0,
          diger: 0,
          pos: 0,
          tahsilat: 0,
          harcama: 0,
          banka: 0,
          oncekiKasa: 0,
          gunSonuKasa: 0,
        };

  // Kasa güncelleme fonksiyonu
  const updateKasa = async (
    fields: Partial<{
      tahsilat: number;
      tahsilatDesc: string;
      harcama: number;
      harcamaDesc: string;
      banka: number;
      bankaDesc: string;
    }>
  ) => {
    const body = {
      date: todayStr,
      tahsilat: fields.tahsilat ?? manualTahsilat,
      tahsilatDesc: fields.tahsilatDesc ?? tahsilatDesc,
      harcama: fields.harcama ?? manualHarcama,
      harcamaDesc: fields.harcamaDesc ?? harcamaDesc,
      banka: fields.banka ?? manualBanka,
      bankaDesc: fields.bankaDesc ?? bankaDesc,
    };
    await fetch("/api/kasa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  // Kartlarda gösterilecek değerleri güncelle
  const lastWithManual = {
    ...last,
    tahsilat: manualTahsilat,
    harcama: manualHarcama,
    banka: manualBanka,
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header activeTab="kasa" lowStockCount={0} onAddProduct={() => {}} />
      <Navigation activeTab="kasa" onTabChange={() => {}} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Kasa Defteri
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-200 to-green-400 dark:from-green-900 dark:to-green-700 rounded-xl p-5 shadow flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
              Nakit Satış
            </span>
            <span className="text-2xl font-bold text-green-800 dark:text-green-200 mt-2">
              ₺{last.nakit.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="bg-gradient-to-br from-blue-200 to-blue-400 dark:from-blue-900 dark:to-blue-700 rounded-xl p-5 shadow flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
              Kredi Kartı Satış
            </span>
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-2">
              ₺{last.krediKarti.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="bg-gradient-to-br from-yellow-200 to-yellow-400 dark:from-yellow-900 dark:to-yellow-700 rounded-xl p-5 shadow flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
              Havale/EFT Satış
            </span>
            <span className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mt-2">
              ₺{last.havale.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="bg-gradient-to-br from-pink-200 to-pink-400 dark:from-pink-900 dark:to-pink-700 rounded-xl p-5 shadow flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
              Diğer Satış
            </span>
            <span className="text-2xl font-bold text-pink-800 dark:text-pink-200 mt-2">
              ₺{last.diger.toLocaleString("tr-TR")}
            </span>
          </div>
          <div className="bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-900 dark:to-orange-700 rounded-2xl p-6 shadow flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💸</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
                Tahsilat
              </span>
              <button
                className="ml-2 text-orange-700 dark:text-orange-200 hover:scale-110 transition-transform"
                onClick={() => {
                  setEditTahsilat(true);
                  setTahsilatDraft(manualTahsilat);
                  setTahsilatDescDraft(tahsilatDesc);
                }}
              >
                ✏️
              </button>
            </div>
            {editTahsilat ? (
              <>
                <input
                  type="number"
                  className="w-28 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 text-center text-orange-800 dark:text-orange-200 text-xl font-bold transition-all outline-none shadow-sm mb-2"
                  value={tahsilatDraft}
                  onChange={(e) => setTahsilatDraft(Number(e.target.value))}
                  min={0}
                  placeholder="Tutar"
                />
                <textarea
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:border-orange-500 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-900 text-orange-800 dark:text-orange-200 text-xs resize-none outline-none shadow-sm"
                  rows={2}
                  value={tahsilatDescDraft}
                  onChange={(e) => setTahsilatDescDraft(e.target.value)}
                  placeholder="Açıklama ekle..."
                />
                <button
                  className="mt-2 px-3 py-1 rounded bg-orange-600 text-white font-bold hover:bg-orange-700 transition-colors"
                  onClick={() => {
                    setManualTahsilat(tahsilatDraft);
                    setTahsilatDesc(tahsilatDescDraft);
                    setEditTahsilat(false);
                    updateKasa({
                      tahsilat: tahsilatDraft,
                      tahsilatDesc: tahsilatDescDraft,
                    });
                  }}
                >
                  ✔️ Onayla
                </button>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-orange-800 dark:text-orange-200 mb-2">
                  ₺{lastWithManual.tahsilat.toLocaleString("tr-TR")}
                </span>
                {tahsilatDesc && (
                  <div className="text-xs text-orange-900 dark:text-orange-200 mt-1 text-center break-words">
                    {tahsilatDesc}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="bg-gradient-to-br from-red-200 to-red-400 dark:from-red-900 dark:to-red-700 rounded-2xl p-6 shadow flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💳</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
                Harcama
              </span>
              <button
                className="ml-2 text-red-700 dark:text-red-200 hover:scale-110 transition-transform"
                onClick={() => {
                  setEditHarcama(true);
                  setHarcamaDraft(manualHarcama);
                  setHarcamaDescDraft(harcamaDesc);
                }}
              >
                ✏️
              </button>
            </div>
            {editHarcama ? (
              <>
                <input
                  type="number"
                  className="w-28 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900 text-center text-red-800 dark:text-red-200 text-xl font-bold transition-all outline-none shadow-sm mb-2"
                  value={harcamaDraft}
                  onChange={(e) => setHarcamaDraft(Number(e.target.value))}
                  min={0}
                  placeholder="Tutar"
                />
                <textarea
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900 text-red-800 dark:text-red-200 text-xs resize-none outline-none shadow-sm"
                  rows={2}
                  value={harcamaDescDraft}
                  onChange={(e) => setHarcamaDescDraft(e.target.value)}
                  placeholder="Açıklama ekle..."
                />
                <button
                  className="mt-2 px-3 py-1 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                  onClick={() => {
                    setManualHarcama(harcamaDraft);
                    setHarcamaDesc(harcamaDescDraft);
                    setEditHarcama(false);
                    updateKasa({
                      harcama: harcamaDraft,
                      harcamaDesc: harcamaDescDraft,
                    });
                  }}
                >
                  ✔️ Onayla
                </button>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-red-800 dark:text-red-200 mb-2">
                  ₺{lastWithManual.harcama.toLocaleString("tr-TR")}
                </span>
                {harcamaDesc && (
                  <div className="text-xs text-red-900 dark:text-red-200 mt-1 text-center break-words">
                    {harcamaDesc}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="bg-gradient-to-br from-purple-200 to-purple-400 dark:from-purple-900 dark:to-purple-700 rounded-2xl p-6 shadow flex flex-col items-center justify-center relative">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🏦</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
                Bankaya Yatan
              </span>
              <button
                className="ml-2 text-purple-700 dark:text-purple-200 hover:scale-110 transition-transform"
                onClick={() => {
                  setEditBanka(true);
                  setBankaDraft(manualBanka);
                  setBankaDescDraft(bankaDesc);
                }}
              >
                ✏️
              </button>
            </div>
            {editBanka ? (
              <>
                <input
                  type="number"
                  className="w-28 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 text-center text-purple-800 dark:text-purple-200 text-xl font-bold transition-all outline-none shadow-sm mb-2"
                  value={bankaDraft}
                  onChange={(e) => setBankaDraft(Number(e.target.value))}
                  min={0}
                  placeholder="Tutar"
                />
                <textarea
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border-2 border-transparent focus:border-purple-500 focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-900 text-purple-800 dark:text-purple-200 text-xs resize-none outline-none shadow-sm"
                  rows={2}
                  value={bankaDescDraft}
                  onChange={(e) => setBankaDescDraft(e.target.value)}
                  placeholder="Açıklama ekle..."
                />
                <button
                  className="mt-2 px-3 py-1 rounded bg-purple-600 text-white font-bold hover:bg-purple-700 transition-colors"
                  onClick={() => {
                    setManualBanka(bankaDraft);
                    setBankaDesc(bankaDescDraft);
                    setEditBanka(false);
                    updateKasa({
                      banka: bankaDraft,
                      bankaDesc: bankaDescDraft,
                    });
                  }}
                >
                  ✔️ Onayla
                </button>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-2">
                  ₺{lastWithManual.banka.toLocaleString("tr-TR")}
                </span>
                {bankaDesc && (
                  <div className="text-xs text-purple-900 dark:text-purple-200 mt-1 text-center break-words">
                    {bankaDesc}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-900 dark:to-gray-700 rounded-xl p-5 shadow flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 tracking-wide uppercase">
              Gün Sonu Kasa
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              ₺{last.gunSonuKasa.toLocaleString("tr-TR")}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full text-sm text-center bg-white dark:bg-gray-800">
            <thead>
              <tr className="bg-gray-200 dark:bg-gray-700 text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Nakit Satış</th>
                <th className="py-3 px-4">Kredi Kartı</th>
                <th className="py-3 px-4">Havale/EFT</th>
                <th className="py-3 px-4">Diğer</th>
                <th className="py-3 px-4">Tahsilat</th>
                <th className="py-3 px-4">Harcama</th>
                <th className="py-3 px-4">Bankaya Yatan</th>
                <th className="py-3 px-4">Gün Sonu Kasa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <React.Fragment key={row.date || `row-${i}`}>
                  <tr
                    className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedDate(row.date);
                      setShowDetail(true);
                    }}
                  >
                    <td className="py-2 px-4 font-bold whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2 px-4 text-green-700 dark:text-green-300 font-semibold">
                      {row.nakit ? (
                        `₺${row.nakit.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-blue-700 dark:text-blue-300 font-semibold">
                      {row.krediKarti ? (
                        `₺${row.krediKarti.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-yellow-700 dark:text-yellow-300 font-semibold">
                      {row.havale ? (
                        `₺${row.havale.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-pink-700 dark:text-pink-300 font-semibold">
                      {row.diger ? (
                        `₺${row.diger.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-orange-700 dark:text-orange-300 font-semibold">
                      {row.tahsilat ? (
                        `₺${row.tahsilat.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-red-700 dark:text-red-300 font-semibold">
                      {row.harcama ? (
                        `₺${row.harcama.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-purple-700 dark:text-purple-300 font-semibold">
                      {row.banka ? (
                        `₺${row.banka.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-gray-900 dark:text-white font-bold">
                      {row.gunSonuKasa ? (
                        `₺${row.gunSonuKasa.toLocaleString("tr-TR")}`
                      ) : (
                        <span className="text-gray-400">₺0</span>
                      )}
                    </td>
                  </tr>
                  {/* Detaylar sadece seçili satır için modalda gösterilecek */}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {/* Detay Modalı */}
        {showDetail && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
              <button
                className="absolute top-2 right-2 text-gray-500 dark:text-gray-300 hover:text-red-500"
                onClick={() => setShowDetail(false)}
              >
                Kapat
              </button>
              <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
                {selectedDate} Gün Detayları
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-orange-200 to-orange-400 dark:from-orange-900 dark:to-orange-700 rounded-xl p-4 flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase mb-1">
                    Tahsilat
                  </span>
                  <span className="text-lg font-bold text-orange-800 dark:text-orange-200">
                    ₺{manualTahsilat.toLocaleString("tr-TR")}
                  </span>
                  {tahsilatDesc && (
                    <div className="text-xs text-orange-900 dark:text-orange-200 mt-1 text-center break-words">
                      {tahsilatDesc}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-red-200 to-red-400 dark:from-red-900 dark:to-red-700 rounded-xl p-4 flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase mb-1">
                    Harcama
                  </span>
                  <span className="text-lg font-bold text-red-800 dark:text-red-200">
                    ₺{manualHarcama.toLocaleString("tr-TR")}
                  </span>
                  {harcamaDesc && (
                    <div className="text-xs text-red-900 dark:text-red-200 mt-1 text-center break-words">
                      {harcamaDesc}
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-br from-purple-200 to-purple-400 dark:from-purple-900 dark:to-purple-700 rounded-xl p-4 flex flex-col items-center">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase mb-1">
                    Bankaya Yatan
                  </span>
                  <span className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    ₺{manualBanka.toLocaleString("tr-TR")}
                  </span>
                  {bankaDesc && (
                    <div className="text-xs text-purple-900 dark:text-purple-200 mt-1 text-center break-words">
                      {bankaDesc}
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-md font-semibold mb-2 text-gray-900 dark:text-white">
                Satış Detayları
              </h3>
              <table className="min-w-full text-xs text-left mb-2">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <th className="py-2 px-2">Saat</th>
                    <th className="py-2 px-2">Ürün</th>
                    <th className="py-2 px-2">Adet</th>
                    <th className="py-2 px-2">Ödeme Tipi</th>
                    <th className="py-2 px-2">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[selectedDate]
                    .sort((a, b) => a.soldAt.localeCompare(b.soldAt))
                    .map((s, idx) => (
                      <tr
                        key={`${s._id || "sale"}-${idx}`}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-1 px-2 whitespace-nowrap">
                          {format(new Date(s.soldAt), "HH:mm")}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap">
                          {s.items?.[0]?.productName || "-"}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap">
                          {s.items?.reduce(
                            (sum, item) => sum + (item.quantity || 0),
                            0
                          ) || 0}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap capitalize">
                          {s.paymentType}
                        </td>
                        <td className="py-1 px-2 whitespace-nowrap">
                          {s.totalAmount ? (
                            `₺${s.totalAmount.toLocaleString("tr-TR")}`
                          ) : (
                            <span className="text-gray-400">₺0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default KasaPage;
