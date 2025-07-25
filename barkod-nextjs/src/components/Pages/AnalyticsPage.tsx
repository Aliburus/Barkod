"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Product, Sale, Payment, Customer } from "../../types";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

import { accountTransactionService } from "../../services/customerService";

interface AnalyticsPageProps {
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  customers: Customer[];
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  products,
  sales,
  payments,
  customers,
}) => {
  const years = Array.from(
    new Set(sales.map((sale) => parseISO(sale.soldAt).getFullYear()))
  ).sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState(
    years[0] || new Date().getFullYear()
  );

  const getSaleWithProduct = (sale: Sale) => {
    let price = sale.price;
    let name = sale.productName;
    if (price == null || name == null || name === "Bilinmiyor") {
      const product = products.find((p) => p.barcode === sale.barcode);
      price = product ? product.price : 0;
      name = product ? product.name : "Bilinmiyor";
    }
    const total = price * sale.quantity;
    return { ...sale, price, productName: name, total };
  };
  const salesWithProduct = sales.map(getSaleWithProduct);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const formatDateTime = (dateStr: string) => {
    return format(parseISO(dateStr), "dd MMMM yyyy HH.mm", { locale: tr });
  };

  // En çok satan ürünler
  const topProducts = Object.entries(
    salesWithProduct.reduce((acc, sale) => {
      const key = sale.productName;
      if (!acc[key]) {
        acc[key] = { quantity: 0, revenue: 0, barcode: sale.barcode };
      }
      acc[key].quantity += sale.quantity;
      acc[key].revenue += sale.total;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number; barcode: string }>)
  )
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // En çok satılan kategoriler
  const categorySales = Object.entries(
    salesWithProduct.reduce((acc, sale) => {
      const product = products.find((p) => p.barcode === sale.barcode);
      const category = product?.category || "Diğer";
      if (!acc[category]) acc[category] = { quantity: 0, revenue: 0 };
      acc[category].quantity += sale.quantity;
      acc[category].revenue += sale.total;
      return acc;
    }, {} as Record<string, { quantity: number; revenue: number }>)
  )
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.quantity - a.quantity);

  // Stok durumu
  const stockAnalysis = {
    total: products.length,
    inStock: products.filter((p) => p.stock > 5).length,
    lowStock: products.filter((p) => p.stock <= 5 && p.stock > 0).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
  };

  // Grafik için aylık satış verisi
  const months = [
    "Oca",
    "Şub",
    "Mar",
    "Nis",
    "May",
    "Haz",
    "Tem",
    "Ağu",
    "Eyl",
    "Eki",
    "Kas",
    "Ara",
  ];
  const monthlySales = Array(12).fill(0);
  salesWithProduct.forEach((sale) => {
    const date = parseISO(sale.soldAt);
    if (date.getFullYear() === selectedYear) {
      const monthIdx = date.getMonth();
      monthlySales[monthIdx] += sale.total;
    }
  });
  const chartData = months.map((name, i) => ({ name, GELİR: monthlySales[i] }));

  // Pie chart için veri
  const pieData = categorySales.map((cat) => ({
    name: cat.category,
    value: cat.revenue,
  }));
  const pieColors = [
    "#6366f1",
    "#f59e42",
    "#10b981",
    "#ef4444",
    "#3b82f6",
    "#a21caf",
    "#fbbf24",
    "#14b8a6",
  ];

  // Haftalık satış trendi
  const weeklySales = Array(7).fill(0);
  const days = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  salesWithProduct.forEach((sale) => {
    const date = parseISO(sale.soldAt);
    const now = new Date();
    const diff = Math.floor(
      (Number(now) - Number(date)) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff < 7) {
      const dayIdx = (now.getDay() - diff + 7) % 7;
      weeklySales[dayIdx] += sale.total;
    }
  });
  const lineData = days.map((name, i) => ({ name, GELİR: weeklySales[i] }));

  // Pagination için örnek (analiz verisine göre uyarlayabilirsin)
  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(sales.length / itemsPerPage);
  const paginatedSales = useMemo(
    () =>
      sales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [sales, currentPage, itemsPerPage]
  );
  // Pagination butonları sadece totalPages > 1 ise göster
  {
    totalPages > 1 && (
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border rounded"
        >
          Önceki
        </button>
        <span>Sayfa {currentPage}</span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border rounded"
        >
          Sonraki
        </button>
      </div>
    );
  }

  // Genel Özet Paneli hesaplamaları
  const toplamStokAdedi = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const toplamUrunCesidi = products.length;
  const toplamSatisGeliri = salesWithProduct.reduce(
    (sum, s) => sum + (s.total || 0),
    0
  );
  const toplamGider = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  // Net kar/zarar: satış ve alış fiyatına göre
  const toplamNetKarZarar = salesWithProduct.reduce((sum, s) => {
    const product = products.find((p) => p.barcode === s.barcode);
    const maliyet = product?.purchasePrice || 0;
    return sum + ((s.price || 0) - maliyet) * (s.quantity || 0);
  }, 0);
  const odememisBorc = customers.reduce((sum, c) => sum + (c.debt || 0), 0);
  const satisTurleri = salesWithProduct.reduce((acc, s) => {
    const tur = s.paymentType || "Bilinmiyor";
    acc[tur] = (acc[tur] || 0) + (s.total || 0);
    return acc;
  }, {} as Record<string, number>);

  const [customerDebts, setCustomerDebts] = useState<Record<string, number>>(
    {}
  );
  useEffect(() => {
    async function fetchDebts() {
      const debts: Record<string, number> = {};
      for (const c of customers) {
        const transactions = await accountTransactionService.getAll(c.id);
        const borc = transactions
          .filter((t) => t.type === "borc")
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        const odeme = transactions
          .filter((t) => t.type === "odeme")
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        debts[c.id] = borc - odeme;
      }
      setCustomerDebts(debts);
    }
    if (customers.length > 0) fetchDebts();
  }, [customers]);

  // Müşteri Ödeme Takip Raporu için borçlu müşteriler
  const borcluMusteriler = customers.filter(
    (c) => (customerDebts[c.id] || 0) > 0
  );

  // En çok alışveriş yapan müşteriler (satış adedine göre)
  const musteriSatisSayilari = customers.map((c) => ({
    id: c.id,
    name: c.name,
    toplamSatis: salesWithProduct
      .filter((s) => s.customer === c.id && !!s.customer)
      .reduce((sum, s) => sum + (s.quantity || 0), 0),
    toplamTutar: salesWithProduct
      .filter((s) => s.customer === c.id && !!s.customer)
      .reduce((sum, s) => sum + (s.total || 0), 0),
  }));
  const enCokAlisverisYapanlar = musteriSatisSayilari
    .filter((m) => m.toplamSatis > 0)
    .sort((a, b) => b.toplamSatis - a.toplamSatis)
    .slice(0, 5);

  // Aylık gelir, gider ve net kar hesaplama
  const monthlySummary: {
    ay: string;
    gelir: number;
    gider: number;
    net: number;
  }[] = [];
  for (let m = 0; m < 12; m++) {
    const ayGelir = salesWithProduct
      .filter((s) => parseISO(s.soldAt).getMonth() === m)
      .reduce((sum, s) => sum + (s.total || 0), 0);
    const ayGider = payments
      .filter((p) => {
        const d = p.date
          ? new Date(p.date)
          : p.dueDate
          ? new Date(p.dueDate)
          : null;
        return d && d.getMonth() === m;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    monthlySummary.push({
      ay: months[m],
      gelir: ayGelir,
      gider: ayGider,
      net: ayGelir - ayGider,
    });
  }

  // Mevcut ayın gideri
  const now = new Date();
  const mevcutAy = now.getMonth();
  const mevcutAyGider = payments
    .filter((p) => {
      const d = p.date
        ? new Date(p.date)
        : p.dueDate
        ? new Date(p.dueDate)
        : null;
      return (
        d && d.getMonth() === mevcutAy && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Mevcut ayın ödenmemiş borçları
  const mevcutAyOdenmemisBorc = payments
    .filter((p) => {
      const d = p.date
        ? new Date(p.date)
        : p.dueDate
        ? new Date(p.dueDate)
        : null;
      return (
        d &&
        d.getMonth() === mevcutAy &&
        d.getFullYear() === now.getFullYear() &&
        !p.isPaid
      );
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Mevcut ayın satış geliri ve net kar
  const mevcutAyGelir = salesWithProduct
    .filter(
      (s) =>
        parseISO(s.soldAt).getMonth() === mevcutAy &&
        parseISO(s.soldAt).getFullYear() === now.getFullYear()
    )
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const mevcutAyNetKar = salesWithProduct
    .filter(
      (s) =>
        parseISO(s.soldAt).getMonth() === mevcutAy &&
        parseISO(s.soldAt).getFullYear() === now.getFullYear()
    )
    .reduce((sum, s) => {
      const product = products.find((p) => p.barcode === s.barcode);
      const maliyet = product?.purchasePrice || 0;
      return sum + ((s.price || 0) - maliyet) * (s.quantity || 0);
    }, 0);

  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  // Filtrelenmiş gelir/gider/net kar hesaplama
  const filteredSales = salesWithProduct.filter((s) => {
    const d = parseISO(s.soldAt);
    if (dateStart && d < new Date(dateStart)) return false;
    if (dateEnd && d > new Date(dateEnd)) return false;
    return true;
  });
  const filteredPayments = payments.filter((p) => {
    const d = p.date
      ? new Date(p.date)
      : p.dueDate
      ? new Date(p.dueDate)
      : null;
    if (!d) return false;
    if (dateStart && d < new Date(dateStart)) return false;
    if (dateEnd && d > new Date(dateEnd)) return false;
    return true;
  });
  const filteredGelir = filteredSales.reduce(
    (sum, s) => sum + (s.total || 0),
    0
  );
  const filteredGider = filteredPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const filteredNetKar = filteredSales.reduce((sum, s) => {
    const product = products.find((p) => p.barcode === s.barcode);
    const maliyet = product?.purchasePrice || 0;
    return sum + ((s.price || 0) - maliyet) * (s.quantity || 0);
  }, 0);
  // Yıllık toplamlar (tüm yıl için)
  const nowYear = now.getFullYear();
  const yillikGelir = salesWithProduct
    .filter((s) => parseISO(s.soldAt).getFullYear() === nowYear)
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const yillikGider = payments
    .filter((p) => {
      const d = p.date
        ? new Date(p.date)
        : p.dueDate
        ? new Date(p.dueDate)
        : null;
      return d && d.getFullYear() === nowYear;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const yillikNetKar = salesWithProduct
    .filter((s) => parseISO(s.soldAt).getFullYear() === nowYear)
    .reduce((sum, s) => {
      const product = products.find((p) => p.barcode === s.barcode);
      const maliyet = product?.purchasePrice || 0;
      return sum + ((s.price || 0) - maliyet) * (s.quantity || 0);
    }, 0);

  // Günlük/Haftalık/Aylık satış adedi ve trendi
  const gunlukSatislar = Array(7).fill(0);
  const haftaninGunleri = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
  salesWithProduct.forEach((s) => {
    const date = parseISO(s.soldAt);
    const now = new Date();
    const diff = Math.floor(
      (Number(now) - Number(date)) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff < 7) {
      const dayIdx = (now.getDay() - diff + 7) % 7;
      gunlukSatislar[dayIdx] += s.quantity || 0;
    }
  });
  // Aylık satış adedi
  const aylikSatislar = Array(12).fill(0);
  salesWithProduct.forEach((s) => {
    const date = parseISO(s.soldAt);
    aylikSatislar[date.getMonth()] += s.quantity || 0;
  });
  // Satış kanalı ve ürün bazlı toplamlar
  const satisKanaliToplam = salesWithProduct.reduce((acc, s) => {
    const tur = s.paymentType || "Bilinmiyor";
    acc[tur] = (acc[tur] || 0) + (s.total || 0);
    return acc;
  }, {} as Record<string, number>);
  const urunBazliToplam = products
    .map((p) => ({
      name: p.name,
      toplam: salesWithProduct
        .filter((s) => s.barcode === p.barcode)
        .reduce((sum, s) => sum + (s.total || 0), 0),
      adet: salesWithProduct
        .filter((s) => s.barcode === p.barcode)
        .reduce((sum, s) => sum + (s.quantity || 0), 0),
    }))
    .filter((u) => u.adet > 0)
    .sort((a, b) => b.adet - a.adet)
    .slice(0, 5);

  // Yıllık Gelir, Maliyet, Brüt Kar, Kar Marjı hesaplama (sadece bir kez tanımlı)
  const yillikSatilanAdet = salesWithProduct
    .filter((s) => parseISO(s.soldAt).getFullYear() === nowYear)
    .reduce((sum, s) => sum + (s.quantity || 0), 0);
  const yillikGelirBrut = salesWithProduct
    .filter((s) => parseISO(s.soldAt).getFullYear() === nowYear)
    .reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 0), 0);
  const yillikMaliyet = salesWithProduct
    .filter((s) => parseISO(s.soldAt).getFullYear() === nowYear)
    .reduce((sum, s) => {
      const product = products.find((p) => p.barcode === s.barcode);
      const maliyet = product?.purchasePrice || 0;
      return sum + maliyet * (s.quantity || 0);
    }, 0);
  const yillikBrutKar = yillikGelirBrut - yillikMaliyet;
  const yillikKarMarji =
    yillikGelirBrut > 0 ? (yillikBrutKar / yillikGelirBrut) * 100 : 0;

  const [salesView, setSalesView] = useState<"gunluk" | "haftalik" | "aylik">(
    "gunluk"
  );
  // Günlük: Son 7 gün, Haftalık: Son 4 hafta, Aylık: Son 12 ay
  const gunler = haftaninGunleri;
  const gunlukTutarlar = Array(7).fill(0);
  salesWithProduct.forEach((s) => {
    const date = parseISO(s.soldAt);
    const now = new Date();
    const diff = Math.floor(
      (Number(now) - Number(date)) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff < 7) {
      const dayIdx = (now.getDay() - diff + 7) % 7;
      gunlukTutarlar[dayIdx] += s.total || 0;
    }
  });
  // Haftalık: Son 4 hafta
  const haftalikTutarlar = Array(4).fill(0);
  salesWithProduct.forEach((s) => {
    const date = parseISO(s.soldAt);
    const now = new Date();
    const diff = Math.floor(
      (Number(now) - Number(date)) / (1000 * 60 * 60 * 24)
    );
    if (diff >= 0 && diff < 28) {
      const weekIdx = 3 - Math.floor(diff / 7);
      haftalikTutarlar[weekIdx] += s.total || 0;
    }
  });
  // Aylık: Son 12 ay
  const aylikTutarlar = Array(12).fill(0);
  salesWithProduct.forEach((s) => {
    const date = parseISO(s.soldAt);
    const now = new Date();
    const diff =
      (now.getFullYear() - date.getFullYear()) * 12 +
      (now.getMonth() - date.getMonth());
    if (diff >= 0 && diff < 12) {
      const monthIdx = 11 - diff;
      aylikTutarlar[monthIdx] += s.total || 0;
    }
  });
  // Bar chart için veri ve label seçimi
  let barLabels: string[] = [];
  let barValues: number[] = [];
  if (salesView === "gunluk") {
    barLabels = gunler;
    barValues = gunlukTutarlar;
  } else if (salesView === "haftalik") {
    barLabels = ["4. Hafta", "3. Hafta", "2. Hafta", "Bu Hafta"];
    barValues = haftalikTutarlar;
  } else {
    barLabels = months;
    barValues = aylikTutarlar;
  }

  const [barHoverIdx, setBarHoverIdx] = useState<number | null>(null);

  // Tooltip için state
  const [tooltip, setTooltip] = useState<null | {
    x: number;
    y: number;
    ay: string;
    gelir: number;
    gider: number;
    net: number;
  }>(null);

  // Bugünkü satış tutarı
  const today = new Date();
  const bugunSatisTutari = salesWithProduct
    .filter((s) => {
      const d = parseISO(s.soldAt);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    })
    .reduce((sum, s) => sum + (s.total || 0), 0);

  // Seçili yıl için aylık gelir/gider/net kar verisi (düzgün hesaplama)
  const aylikGelirGiderNet = months.map((ay, i) => {
    // Gelir: satış fiyatı * adet
    const gelir = salesWithProduct
      .filter(
        (s) =>
          parseISO(s.soldAt).getMonth() === i &&
          parseISO(s.soldAt).getFullYear() === selectedYear
      )
      .reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 0), 0);
    // Gider: alış fiyatı * adet
    const gider = salesWithProduct
      .filter(
        (s) =>
          parseISO(s.soldAt).getMonth() === i &&
          parseISO(s.soldAt).getFullYear() === selectedYear
      )
      .reduce((sum, s) => {
        const product = products.find((p) => p.barcode === s.barcode);
        const maliyet = product?.purchasePrice || 0;
        return sum + maliyet * (s.quantity || 0);
      }, 0);
    return {
      ay,
      gelir,
      gider,
      net: gelir - gider,
    };
  });

  return (
    <div className="space-y-6">
      {/* Genel Özet Paneli + Kasa & Banka Takibi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-blue-900 dark:text-blue-200">
            {toplamStokAdedi}
          </span>
          <span className="text-sm text-blue-800 dark:text-blue-300 mt-1">
            Toplam Stok Adedi
          </span>
        </div>
        <div className="bg-gradient-to-br from-green-100 to-green-300 dark:from-green-900 dark:to-green-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-green-900 dark:text-green-200">
            {toplamUrunCesidi}
          </span>
          <span className="text-sm text-green-800 dark:text-green-300 mt-1">
            Ürün Çeşidi
          </span>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-purple-300 dark:from-purple-900 dark:to-purple-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-purple-900 dark:text-purple-200">
            {formatPrice(mevcutAyGelir)}
          </span>
          <span className="text-sm text-purple-800 dark:text-purple-300 mt-1">
            Bu Ayın Satış Geliri
          </span>
        </div>
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-300 dark:from-yellow-900 dark:to-yellow-700 rounded-xl p-6 shadow flex flex-col items-center justify-center col-span-1 sm:col-span-2 lg:col-span-1">
          <span className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
            {formatPrice(mevcutAyNetKar)}
          </span>
          <span className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
            Bu Ayın Net Kar / Zarar
          </span>
        </div>
        {/* Bugünkü satış tutarı kartı */}
        <div className="bg-gradient-to-br from-pink-100 to-pink-300 dark:from-pink-900 dark:to-pink-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-pink-900 dark:text-pink-200">
            {formatPrice(bugunSatisTutari)}
          </span>
          <span className="text-sm text-pink-800 dark:text-pink-300 mt-1">
            Bugünkü Satış Tutarı
          </span>
        </div>
      </div>
      {/* Aylık Gelir-Gider Tablosu */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Aylık Gelir / Gider / Net Kar
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Yıl:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-center">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="px-3 py-2">Ay</th>
                <th className="px-3 py-2">Gelir</th>
                <th className="px-3 py-2">Gider</th>
                <th className="px-3 py-2">Net Kar</th>
              </tr>
            </thead>
            <tbody>
              {monthlySummary
                .filter((row, i) => {
                  // Seçili yıl için gelir/gider/net kar hesapla
                  const ayGelir = salesWithProduct
                    .filter(
                      (s) =>
                        parseISO(s.soldAt).getMonth() === i &&
                        parseISO(s.soldAt).getFullYear() === selectedYear
                    )
                    .reduce((sum, s) => sum + (s.total || 0), 0);
                  const ayGider = payments
                    .filter((p) => {
                      const d = p.date
                        ? new Date(p.date)
                        : p.dueDate
                        ? new Date(p.dueDate)
                        : null;
                      return (
                        d &&
                        d.getMonth() === i &&
                        d.getFullYear() === selectedYear
                      );
                    })
                    .reduce((sum, p) => sum + (p.amount || 0), 0);
                  const ayNet = ayGelir - ayGider;
                  row.gelir = ayGelir;
                  row.gider = ayGider;
                  row.net = ayNet;
                  return true;
                })
                .map((row, i) => (
                  <tr
                    key={row.ay}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-3 py-2 font-semibold">{row.ay}</td>
                    <td className="px-3 py-2 text-green-700 dark:text-green-400">
                      {formatPrice(row.gelir)}
                    </td>
                    <td className="px-3 py-2 text-red-700 dark:text-red-400">
                      {formatPrice(row.gider)}
                    </td>
                    <td
                      className={`px-3 py-2 font-bold ${
                        row.net >= 0
                          ? "text-green-700 dark:text-green-400"
                          : "text-red-700 dark:text-red-400"
                      }`}
                    >
                      {formatPrice(row.net)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Stok Hareket Raporları */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Stok Hareket Raporları
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Günlük/Aylık Stok Giriş-Çıkış */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-600 dark:from-blue-900 dark:to-blue-800 rounded-xl p-5 shadow flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white mb-2">
              Günlük/Aylık Stok Giriş-Çıkış
            </span>
            <span className="text-sm text-blue-100">
              (Stok hareket verisi eklenirse buraya grafik eklenir)
            </span>
          </div>
          {/* Kritik Stok (Kategoriye göre) */}
          <div className="bg-gradient-to-br from-red-800 to-red-600 dark:from-red-900 dark:to-red-800 rounded-xl p-5 shadow flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white mb-2">
              Kritik Stok (≤5) - Kategoriye Göre
            </span>
            <ul className="text-sm text-red-100 list-disc pl-4">
              {(() => {
                const kategoriler = Array.from(
                  new Set(products.map((p) => p.category || "Diğer"))
                );
                return kategoriler.map((cat, idx) => {
                  const kritiks = products.filter(
                    (p) => (p.category || "Diğer") === cat && p.stock <= 5
                  );
                  if (kritiks.length === 0) return null;
                  return (
                    <li key={cat + "-" + idx} className="mb-1">
                      <span className="font-semibold">{cat}:</span>{" "}
                      {kritiks
                        .map((p) => `${p.name} (${p.stock} adet)`)
                        .join(", ")}
                    </li>
                  );
                });
              })()}
              {products.filter((p) => p.stock <= 5).length === 0 && (
                <li>Tüm ürünlerin stoğu yeterli.</li>
              )}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* En Çok Satan Kategoriler */}
          <div className="bg-gradient-to-br from-green-800 to-green-600 dark:from-green-900 dark:to-green-800 rounded-xl p-5 shadow flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-white mb-2">
              En Çok Satan Kategoriler
            </span>
            <ul className="text-sm text-green-100 list-decimal pl-4">
              {categorySales.slice(0, 5).map((cat, i) => (
                <li key={cat.category + "-" + i}>
                  {cat.category} ({cat.quantity} adet)
                </li>
              ))}
              {categorySales.length === 0 && <li>Satış verisi yok.</li>}
            </ul>
          </div>
          {/* Ürün Bazlı Stok Durumu */}
          <div className="bg-gradient-to-br from-yellow-800 to-yellow-600 dark:from-yellow-900 dark:to-yellow-800 rounded-xl p-5 shadow flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-yellow-100 mb-2">
              Ürün Bazlı Stok Durumu
            </span>
            <ul className="text-sm text-yellow-100 list-disc pl-4">
              {products.slice(0, 5).map((p, idx) => (
                <li key={p.id + "-" + idx}>
                  {p.name}: {p.stock} adet
                </li>
              ))}
              {products.length === 0 && <li>Ürün verisi yok.</li>}
            </ul>
          </div>
        </div>
      </div>
      {/* Gelir-Gider Analizi */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Gelir-Gider Analizi
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Yıl:
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-100 to-green-300 dark:from-green-900 dark:to-green-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-green-900 dark:text-green-200">
              {formatPrice(
                salesWithProduct
                  .filter(
                    (s) => parseISO(s.soldAt).getFullYear() === selectedYear
                  )
                  .reduce(
                    (sum, s) => sum + (s.price || 0) * (s.quantity || 0),
                    0
                  )
              )}
            </span>
            <span className="text-sm text-green-800 dark:text-green-300 mt-1">
              Yıllık Gelir (Ciro)
            </span>
          </div>
          <div className="bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-900 dark:to-gray-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-200">
              {formatPrice(
                salesWithProduct
                  .filter(
                    (s) => parseISO(s.soldAt).getFullYear() === selectedYear
                  )
                  .reduce((sum, s) => {
                    const product = products.find(
                      (p) => p.barcode === s.barcode
                    );
                    const maliyet = product?.purchasePrice || 0;
                    return sum + maliyet * (s.quantity || 0);
                  }, 0)
              )}
            </span>
            <span className="text-sm text-gray-800 dark:text-gray-300 mt-1">
              Yıllık Maliyet
            </span>
          </div>
          <div className="bg-gradient-to-br from-yellow-100 to-yellow-300 dark:from-yellow-900 dark:to-yellow-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
              {(() => {
                const gelir = salesWithProduct
                  .filter(
                    (s) => parseISO(s.soldAt).getFullYear() === selectedYear
                  )
                  .reduce(
                    (sum, s) => sum + (s.price || 0) * (s.quantity || 0),
                    0
                  );
                const maliyet = salesWithProduct
                  .filter(
                    (s) => parseISO(s.soldAt).getFullYear() === selectedYear
                  )
                  .reduce((sum, s) => {
                    const product = products.find(
                      (p) => p.barcode === s.barcode
                    );
                    const m = product?.purchasePrice || 0;
                    return sum + m * (s.quantity || 0);
                  }, 0);
                return formatPrice(gelir - maliyet);
              })()}
            </span>
            <span className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
              Brüt Kar
            </span>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-xl p-6 shadow flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-blue-900 dark:text-blue-200">
              {(() => {
                const gelir = salesWithProduct
                  .filter(
                    (s) => parseISO(s.soldAt).getFullYear() === selectedYear
                  )
                  .reduce(
                    (sum, s) => sum + (s.price || 0) * (s.quantity || 0),
                    0
                  );
                const maliyet = salesWithProduct
                  .filter(
                    (s) => parseISO(s.soldAt).getFullYear() === selectedYear
                  )
                  .reduce((sum, s) => {
                    const product = products.find(
                      (p) => p.barcode === s.barcode
                    );
                    const m = product?.purchasePrice || 0;
                    return sum + m * (s.quantity || 0);
                  }, 0);
                const karMarji =
                  gelir > 0 ? ((gelir - maliyet) / gelir) * 100 : 0;
                return `%${karMarji.toFixed(1)}`;
              })()}
            </span>
            <span className="text-sm text-blue-800 dark:text-blue-300 mt-1">
              Kar Marjı
            </span>
          </div>
        </div>
        {/* Kartlar ile grafik arasında boşluk ekle */}
        <div className="h-16 md:h-24 lg:h-28" />
        <div className="w-full h-[420px] flex items-center justify-center relative">
          {/* Tooltip için state */}
          {tooltip && (
            <div
              style={{
                position: "absolute",
                left: tooltip.x,
                top: tooltip.y - 50,
                background: "rgba(30,41,59,0.95)",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: 16,
                pointerEvents: "none",
                zIndex: 10,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <div>
                <b>{tooltip.ay}</b>
              </div>
              <div>Gelir: {formatPrice(tooltip.gelir)}</div>
              <div>Gider: {formatPrice(tooltip.gider)}</div>
              <div>Net Kar: {formatPrice(tooltip.net)}</div>
            </div>
          )}
          {/* Geniş ve modern çizgi grafik */}
          <svg width="100%" height="100%" viewBox="0 0 1200 420">
            {/* Y ekseni değerleri ve çizgileri (y 90'dan başlasın) */}
            <g>
              {[0, 1, 2, 3, 4].map((i) => {
                const max = Math.max(
                  ...aylikGelirGiderNet.map((a) =>
                    Math.max(a.gelir, a.gider, a.net)
                  ),
                  100
                );
                const y = 90 + i * 70;
                return (
                  <g key={i}>
                    <text x={0} y={y} fontSize="18" fill="#b3b3b3">
                      {formatPrice((max * (4 - i)) / 4)}
                    </text>
                    <line
                      x1={80}
                      y1={y - 5}
                      x2={1150}
                      y2={y - 5}
                      stroke="#444"
                      strokeDasharray="4 4"
                    />
                  </g>
                );
              })}
            </g>
            {/* Ay isimleri */}
            <g>
              {aylikGelirGiderNet.map((a, i) => (
                <text
                  key={a.ay}
                  x={120 + i * 90}
                  y={410}
                  fontSize="18"
                  fill="#b3b3b3"
                  textAnchor="middle"
                >
                  {a.ay}
                </text>
              ))}
            </g>
            {/* Gelir çizgisi */}
            <polyline
              fill="none"
              stroke="#22c55e"
              strokeWidth="5"
              points={aylikGelirGiderNet
                .map((a, i) => {
                  const max = Math.max(
                    ...aylikGelirGiderNet.map((a) =>
                      Math.max(a.gelir, a.gider, a.net)
                    ),
                    100
                  );
                  const x = 120 + i * 90;
                  const y = 90 + 280 * (1 - a.gelir / (max || 1));
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* Gider çizgisi */}
            <polyline
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              points={aylikGelirGiderNet
                .map((a, i) => {
                  const max = Math.max(
                    ...aylikGelirGiderNet.map((a) =>
                      Math.max(a.gelir, a.gider, a.net)
                    ),
                    100
                  );
                  const x = 120 + i * 90;
                  const y = 90 + 280 * (1 - a.gider / (max || 1));
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* Net kar çizgisi */}
            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="5"
              points={aylikGelirGiderNet
                .map((a, i) => {
                  const max = Math.max(
                    ...aylikGelirGiderNet.map((a) =>
                      Math.max(a.gelir, a.gider, a.net)
                    ),
                    100
                  );
                  const x = 120 + i * 90;
                  // Net kar çizgisini diğerlerinden biraz daha yukarı/ayrı göster
                  const y = 90 + 280 * (1 - (a.net + max * 0.15) / (max || 1));
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {/* Noktalar */}
            {aylikGelirGiderNet.map((a, i) => {
              const max = Math.max(
                ...aylikGelirGiderNet.map((a) =>
                  Math.max(a.gelir, a.gider, a.net)
                ),
                100
              );
              const x = 120 + i * 90;
              const yGelir = 90 + 280 * (1 - a.gelir / (max || 1));
              const yGider = 90 + 280 * (1 - a.gider / (max || 1));
              const yNet = 90 + 280 * (1 - (a.net + max * 0.15) / (max || 1));
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={yGelir}
                    r={7}
                    fill="#22c55e"
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      const svg = e.currentTarget.ownerSVGElement;
                      if (!svg) return;
                      setTooltip({
                        x:
                          e.currentTarget.getBoundingClientRect().left -
                          svg.getBoundingClientRect().left +
                          20,
                        y:
                          e.currentTarget.getBoundingClientRect().top -
                          svg.getBoundingClientRect().top,
                        ay: a.ay,
                        gelir: a.gelir,
                        gider: a.gider,
                        net: a.net,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  <circle
                    cx={x}
                    cy={yGider}
                    r={7}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      const svg = e.currentTarget.ownerSVGElement;
                      if (!svg) return;
                      setTooltip({
                        x:
                          e.currentTarget.getBoundingClientRect().left -
                          svg.getBoundingClientRect().left +
                          20,
                        y:
                          e.currentTarget.getBoundingClientRect().top -
                          svg.getBoundingClientRect().top,
                        ay: a.ay,
                        gelir: a.gelir,
                        gider: a.gider,
                        net: a.net,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                  <circle
                    cx={x}
                    cy={yNet}
                    r={7}
                    fill="#fbbf24"
                    stroke="#fff"
                    strokeWidth="2"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      const svg = e.currentTarget.ownerSVGElement;
                      if (!svg) return;
                      setTooltip({
                        x:
                          e.currentTarget.getBoundingClientRect().left -
                          svg.getBoundingClientRect().left +
                          20,
                        y:
                          e.currentTarget.getBoundingClientRect().top -
                          svg.getBoundingClientRect().top,
                        ay: a.ay,
                        gelir: a.gelir,
                        gider: a.gider,
                        net: a.net,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
        {/* Legend kutusu SVG dışında, grafiğin hemen altında */}
        <div className="w-full flex justify-center mt-4">
          <div className="flex gap-8 items-center bg-black/60 rounded-lg px-8 py-3 z-20">
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 h-6 rounded bg-[#22c55e] border-2 border-white"></span>
              <span className="text-lg font-bold text-[#22c55e]">Gelir</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 h-6 rounded bg-[#ef4444] border-2 border-white"></span>
              <span className="text-lg font-bold text-[#ef4444]">Gider</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-6 h-6 rounded bg-[#fbbf24] border-2 border-white"></span>
              <span className="text-lg font-bold text-[#fbbf24]">Net Kar</span>
            </div>
          </div>
        </div>
      </div>
      {/* Müşteri Ödeme Takip Raporu */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Müşteri Ödeme Takip Raporu
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="bg-gradient-to-br from-pink-100 to-pink-300 dark:from-pink-900 dark:to-pink-700 rounded-xl p-5 shadow flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-pink-900 dark:text-pink-200 mb-2">
              Borçlu Müşteriler
            </span>
            <ul className="text-sm text-pink-800 dark:text-pink-300 list-disc pl-4">
              {borcluMusteriler.slice(0, 5).map((c, idx) => (
                <li key={c.id + "-" + idx}>
                  {c.name}: {formatPrice(customerDebts[c.id] || 0)}
                </li>
              ))}
              {borcluMusteriler.length === 0 && <li>Borçlu müşteri yok.</li>}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700 rounded-xl p-5 shadow flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-blue-900 dark:text-blue-200 mb-2">
              En Çok Alışveriş Yapanlar
            </span>
            <ul className="text-sm text-blue-800 dark:text-blue-300 list-decimal pl-4">
              {enCokAlisverisYapanlar.map((m, idx) => (
                <li key={m.id + "-" + idx}>
                  {m.name}: {m.toplamSatis} satış, {formatPrice(m.toplamTutar)}
                </li>
              ))}
              {enCokAlisverisYapanlar.length === 0 && (
                <li>Satış verisi yok.</li>
              )}
            </ul>
          </div>
        </div>
        <div className="w-full h-32 flex items-center justify-center">
          <span className="text-xs text-gray-400">
            (Tahsilat/gecikme, veresiye, ödeme hareketleri grafiği eklenebilir)
          </span>
        </div>
      </div>
      {/* Satış Raporları */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Satış Raporları
        </h3>
        <div className="mb-4">
          <div className="bg-gradient-to-br from-purple-400 to-purple-700 dark:from-purple-900 dark:to-purple-700 rounded-xl p-5 shadow flex flex-col items-center justify-center w-full">
            <span className="text-lg font-bold text-white mb-2">
              Günlük/Haftalık/Aylık Satış
            </span>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSalesView("gunluk")}
                className={`px-3 py-1 rounded ${
                  salesView === "gunluk"
                    ? "bg-white text-purple-700 font-bold"
                    : "bg-purple-700 text-white"
                } transition`}
              >
                Günlük
              </button>
              <button
                onClick={() => setSalesView("haftalik")}
                className={`px-3 py-1 rounded ${
                  salesView === "haftalik"
                    ? "bg-white text-purple-700 font-bold"
                    : "bg-purple-700 text-white"
                } transition`}
              >
                Haftalık
              </button>
              <button
                onClick={() => setSalesView("aylik")}
                className={`px-3 py-1 rounded ${
                  salesView === "aylik"
                    ? "bg-white text-purple-700 font-bold"
                    : "bg-purple-700 text-white"
                } transition`}
              >
                Aylık
              </button>
            </div>
            <div className="w-full h-48 flex items-end gap-2 justify-between mt-4 relative">
              {/* Y ekseni (tutar) */}
              <div
                className="absolute left-0 top-0 h-full flex flex-col justify-between z-10"
                style={{ height: "100%" }}
              >
                {[4, 3, 2, 1, 0].map((i) => {
                  const max = Math.max(...barValues, 100);
                  return (
                    <span
                      key={i}
                      className="text-xs text-white/70"
                      style={{ height: "20%" }}
                    >
                      {formatPrice((max / 4) * i)}
                    </span>
                  );
                })}
              </div>
              <div className="flex-1 flex items-end gap-4 ml-8 w-full">
                {barValues.map((v, i) => {
                  const max = Math.max(...barValues, 100);
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center w-full relative"
                      onMouseEnter={() => setBarHoverIdx(i)}
                      onMouseLeave={() => setBarHoverIdx(null)}
                    >
                      <div
                        className="bg-white/80 dark:bg-purple-300 rounded-t cursor-pointer"
                        style={{
                          height: `${(v / (max || 1)) * 140 + 8}px`,
                          width: "22px",
                          transition: "height 0.3s",
                        }}
                        title={formatPrice(v)}
                      ></div>
                      {barHoverIdx === i && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-xs rounded z-20 whitespace-nowrap pointer-events-none">
                          {formatPrice(v)}
                        </div>
                      )}
                      <span className="text-xs text-white mt-1">
                        {barLabels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-32 flex items-center justify-center">
          <span className="text-xs text-gray-400">
            (Satış trend grafikleri, filtreleme eklenebilir)
          </span>
        </div>
      </div>
      {/* Filtreleme ve İndirme */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Filtreleme ve İndirme
        </h3>
        <div className="flex flex-wrap gap-4 mb-4 items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tarih Aralığı:
          </label>
          <input
            type="date"
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="mx-2">-</span>
          <input
            type="date"
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-4">
            Kategori / Müşteri / Ödeme Türü:
          </label>
          <span className="text-xs text-gray-400 ml-2">
            (Filtreleme ve indirme fonksiyonu eklenebilir)
          </span>
        </div>
        <div className="w-full h-16 flex items-center justify-center">
          <button className="bg-primary-600 text-white px-4 py-2 rounded shadow hover:bg-primary-700 transition-colors text-sm font-semibold">
            Excel İndir
          </button>
          <button className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700 transition-colors text-sm font-semibold ml-2">
            PDF İndir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
