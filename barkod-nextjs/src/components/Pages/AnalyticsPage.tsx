"use client";
import React, { useState, useEffect } from "react";
import type {
  Product,
  Sale,
  Payment,
  Customer,
  Expense,
  KasaRow,
} from "../../types";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";

import { accountTransactionService } from "../../services/customerService";

interface AnalyticsPageProps {
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  customers: Customer[];
  expenses: Expense[];
  kasaRows?: KasaRow[];
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  products,
  sales,
  payments,
  customers,
  expenses,
  kasaRows = [],
}) => {
  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  // Kasa günlük harcama giderini bugünün tarihiyle ekle
  const todayStr = new Date().toISOString().split("T")[0];
  const kasaBugun = kasaRows.find((k) => k.date === todayStr);
  const kasaHarcamaGider: Expense | null =
    kasaBugun && kasaBugun.harcama > 0
      ? {
          id: "kasa-" + todayStr,
          amount: kasaBugun.harcama,
          desc: "Kasa Harcama",
          frequency: "tek",
          paymentDate: todayStr,
          status: "active",
        }
      : null;
  const allExpenses = kasaHarcamaGider
    ? [...safeExpenses, kasaHarcamaGider]
    : safeExpenses;
  // Yıllar: satış, ödeme ve giderlerin tüm yıllarını kapsa
  const saleYears = sales.map((sale) => parseISO(sale.soldAt).getFullYear());
  const paymentYears = payments
    .map((p) => {
      const d = p.date
        ? new Date(p.date)
        : p.dueDate
        ? new Date(p.dueDate)
        : null;
      return d ? d.getFullYear() : null;
    })
    .filter((y) => y !== null);
  const expenseYears = allExpenses
    .map((g) => (g.paymentDate ? new Date(g.paymentDate).getFullYear() : null))
    .filter((y) => y !== null);
  const allYears = [...saleYears, ...paymentYears, ...expenseYears];
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
  const paginatedSales = sales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
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
  // Giderleri payments ve expenses ile birlikte hesapla
  const toplamGider = [
    ...payments.map((p) => p.amount || 0),
    ...allExpenses
      .filter((g: Expense) => g.status === "active" || g.status === undefined)
      .map((g: Expense) => g.amount),
  ].reduce((a, b) => a + b, 0);
  // Net kar/zarar: satış ve alış fiyatına göre, giderleri de düş
  const toplamNetKarZarar =
    salesWithProduct.reduce((sum, s) => {
      const product = products.find((p) => p.barcode === s.barcode);
      const maliyet = product?.purchasePrice || 0;
      return sum + ((s.price || 0) - maliyet) * (s.quantity || 0);
    }, 0) - toplamGider;
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
    giderDetay?: Expense[];
  }[] = [];
  for (let m = 0; m < 12; m++) {
    const ayGelir = salesWithProduct
      .filter(
        (s) =>
          parseISO(s.soldAt).getMonth() === m &&
          parseISO(s.soldAt).getFullYear() === selectedYear
      )
      .reduce((sum, s) => sum + (s.total || 0), 0);
    // Payments ve giderler birlikte
    const ayGiderler = [
      ...payments
        .filter((p) => {
          const d = p.date
            ? new Date(p.date)
            : p.dueDate
            ? new Date(p.dueDate)
            : null;
          return d && d.getMonth() === m && d.getFullYear() === selectedYear;
        })
        .map((p) => p.amount || 0),
      ...allExpenses
        .filter((g: Expense) => {
          // status ve frequency kontrollerini daha güvenli yap
          const status = (g.status || "").toLowerCase();
          const freq = (g.frequency || "").toLowerCase();
          if (status !== "active" && g.status !== undefined) return false;
          if (!g.paymentDate) return false;
          const d = new Date(g.paymentDate);
          if (freq === "tek") {
            return d.getFullYear() === selectedYear && d.getMonth() === m;
          }
          if (freq === "aylık") {
            return (
              d.getFullYear() < selectedYear ||
              (d.getFullYear() === selectedYear && d.getMonth() <= m)
            );
          }
          if (freq === "yıllık") {
            return d.getMonth() === m && d.getFullYear() <= selectedYear;
          }
          return false;
        })
        .map((g: Expense) => g.amount),
    ];
    const ayGider = ayGiderler.reduce((a, b) => a + b, 0);
    // Gider detaylarını da ekle
    const giderDetay = allExpenses.filter((g: Expense) => {
      const status = (g.status || "").toLowerCase();
      const freq = (g.frequency || "").toLowerCase();
      if (status !== "active" && g.status !== undefined) return false;
      if (!g.paymentDate) return false;
      const d = new Date(g.paymentDate);
      if (freq === "tek") {
        return d.getFullYear() === selectedYear && d.getMonth() === m;
      }
      if (freq === "aylık") {
        return (
          d.getFullYear() < selectedYear ||
          (d.getFullYear() === selectedYear && d.getMonth() <= m)
        );
      }
      if (freq === "yıllık") {
        return d.getMonth() === m && d.getFullYear() <= selectedYear;
      }
      return false;
    });
    monthlySummary.push({
      ay: months[m],
      gelir: ayGelir,
      gider: ayGider,
      net: ayGelir - ayGider,
      giderDetay,
    });
  }
  // Yıllık toplamlar (tüm yıl için)
  const nowYear = new Date().getFullYear();
  const yillikGelir = salesWithProduct
    .filter((s) => parseISO(s.soldAt).getFullYear() === nowYear)
    .reduce((sum, s) => sum + (s.total || 0), 0);
  const yillikGider = [
    ...payments
      .filter((p) => {
        const d = p.date
          ? new Date(p.date)
          : p.dueDate
          ? new Date(p.dueDate)
          : null;
        return d && d.getFullYear() === nowYear;
      })
      .map((p) => p.amount || 0),
    ...allExpenses
      .filter(
        (g: Expense) =>
          (g.status === "active" || g.status === undefined) &&
          g.paymentDate &&
          new Date(g.paymentDate).getFullYear() === nowYear
      )
      .map((g: Expense) => g.amount),
  ].reduce((a, b) => a + b, 0);
  const yillikNetKar = yillikGelir - yillikGider;

  // Mevcut ayın gideri (payments + expenses)
  const now = new Date();
  const mevcutAy = now.getMonth();
  const mevcutAyGider = [
    ...payments
      .filter((p) => {
        const d = p.date
          ? new Date(p.date)
          : p.dueDate
          ? new Date(p.dueDate)
          : null;
        return (
          d &&
          d.getMonth() === mevcutAy &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .map((p) => p.amount || 0),
    ...allExpenses
      .filter((g: Expense) => {
        const status = (g.status || "").toLowerCase();
        const freq = (g.frequency || "").toLowerCase();
        if (status !== "active" && g.status !== undefined) return false;
        if (!g.paymentDate) return false;
        const d = new Date(g.paymentDate);
        if (freq === "tek") {
          return (
            d.getFullYear() === now.getFullYear() && d.getMonth() === mevcutAy
          );
        }
        if (freq === "aylık") {
          return (
            d.getFullYear() < now.getFullYear() ||
            (d.getFullYear() === now.getFullYear() && d.getMonth() <= mevcutAy)
          );
        }
        if (freq === "yıllık") {
          return (
            d.getMonth() === mevcutAy && d.getFullYear() <= now.getFullYear()
          );
        }
        return false;
      })
      .map((g: Expense) => g.amount),
  ].reduce((a, b) => a + b, 0);

  // Mevcut ayın net kar (satış karı - giderler)
  const mevcutAyNetKar =
    salesWithProduct
      .filter(
        (s) =>
          parseISO(s.soldAt).getMonth() === mevcutAy &&
          parseISO(s.soldAt).getFullYear() === now.getFullYear()
      )
      .reduce((sum, s) => {
        const product = products.find((p) => p.barcode === s.barcode);
        const maliyet = product?.purchasePrice || 0;
        return sum + ((s.price || 0) - maliyet) * (s.quantity || 0);
      }, 0) - mevcutAyGider;

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
  const yillikBrutKar = yillikGelirBrut - yillikMaliyet - yillikGider;
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
    // Gider: alış fiyatı * adet + payments + allExpenses
    const gider = [
      ...payments
        .filter((p) => {
          const d = p.date
            ? new Date(p.date)
            : p.dueDate
            ? new Date(p.dueDate)
            : null;
          return d && d.getMonth() === i && d.getFullYear() === selectedYear;
        })
        .map((p) => p.amount || 0),
      ...allExpenses
        .filter((g: Expense) => {
          const status = (g.status || "").toLowerCase();
          const freq = (g.frequency || "").toLowerCase();
          if (status !== "active" && g.status !== undefined) return false;
          if (!g.paymentDate) return false;
          const d = new Date(g.paymentDate);
          if (freq === "tek") {
            return d.getFullYear() === selectedYear && d.getMonth() === i;
          }
          if (freq === "aylık") {
            return (
              d.getFullYear() < selectedYear ||
              (d.getFullYear() === selectedYear && d.getMonth() <= i)
            );
          }
          if (freq === "yıllık") {
            return d.getMonth() === i && d.getFullYear() <= selectedYear;
          }
          return false;
        })
        .map((g: Expense) => g.amount),
    ].reduce((a, b) => a + b, 0);
    // Satış maliyeti
    const maliyet = salesWithProduct
      .filter(
        (s) =>
          parseISO(s.soldAt).getMonth() === i &&
          parseISO(s.soldAt).getFullYear() === selectedYear
      )
      .reduce((sum, s) => {
        const product = products.find((p) => p.barcode === s.barcode);
        const m = product?.purchasePrice || 0;
        return sum + m * (s.quantity || 0);
      }, 0);
    return {
      ay,
      gelir,
      gider: gider + maliyet,
      net: gelir - (gider + maliyet),
    };
  });

  // Modal için state
  const [giderModal, setGiderModal] = useState<null | {
    payments: Payment[];
    expenses: Expense[];
    ay: string;
  }>(null);

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
            {formatPrice(
              salesWithProduct
                .filter(
                  (s) =>
                    parseISO(s.soldAt).getMonth() === mevcutAy &&
                    parseISO(s.soldAt).getFullYear() === now.getFullYear()
                )
                .reduce((sum, s) => sum + (s.price || 0) * (s.quantity || 0), 0)
            )}
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
                  const ayGider = [
                    ...payments
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
                      .map((p) => p.amount || 0),
                    ...allExpenses
                      .filter((g: Expense) => {
                        const status = (g.status || "").toLowerCase();
                        const freq = (g.frequency || "").toLowerCase();
                        if (status !== "active" && g.status !== undefined)
                          return false;
                        if (!g.paymentDate) return false;
                        const d = new Date(g.paymentDate);
                        if (freq === "tek") {
                          return (
                            d.getFullYear() === selectedYear &&
                            d.getMonth() === i
                          );
                        }
                        if (freq === "aylık") {
                          return (
                            d.getFullYear() < selectedYear ||
                            (d.getFullYear() === selectedYear &&
                              d.getMonth() <= i)
                          );
                        }
                        if (freq === "yıllık") {
                          return (
                            d.getMonth() === i &&
                            d.getFullYear() <= selectedYear
                          );
                        }
                        return false;
                      })
                      .map((g: Expense) => g.amount),
                  ].reduce((a, b) => a + b, 0);
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
                    <td
                      className="px-3 py-2 text-red-700 dark:text-red-400 cursor-pointer underline"
                      onClick={() => {
                        // O ayın payments ve giderlerini bul
                        const ayPayments = payments.filter((p) => {
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
                        });
                        const ayExpenses = allExpenses.filter((g: Expense) => {
                          const status = (g.status || "").toLowerCase();
                          const freq = (g.frequency || "").toLowerCase();
                          if (status !== "active" && g.status !== undefined)
                            return false;
                          if (!g.paymentDate) return false;
                          const d = new Date(g.paymentDate);
                          if (freq === "tek") {
                            return (
                              d.getFullYear() === selectedYear &&
                              d.getMonth() === i
                            );
                          }
                          if (freq === "aylık") {
                            return (
                              d.getFullYear() < selectedYear ||
                              (d.getFullYear() === selectedYear &&
                                d.getMonth() <= i)
                            );
                          }
                          if (freq === "yıllık") {
                            return (
                              d.getMonth() === i &&
                              d.getFullYear() <= selectedYear
                            );
                          }
                          return false;
                        });
                        setGiderModal({
                          payments: ayPayments,
                          expenses: ayExpenses,
                          ay: row.ay,
                        });
                      }}
                    >
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
        {/* Gider Detay Modalı */}
        {giderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 min-w-[320px] max-w-[90vw] shadow-xl">
              <h3 className="text-lg font-bold mb-4">
                {giderModal.ay} Gider Detayı
              </h3>
              <div className="space-y-4">
                {giderModal.payments.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">
                      Ödemeler (Taksitler):
                    </div>
                    <ul className="list-disc pl-4">
                      {giderModal.payments.map((p, idx) => (
                        <li key={p.id || idx}>
                          {`${idx + 1}. Taksit - Ödeme`} -{" "}
                          {formatPrice(p.amount)}
                          {p.date
                            ? ` (${format(new Date(p.date), "dd.MM.yyyy")})`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {giderModal.expenses.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Giderler:</div>
                    <ul className="list-disc pl-4">
                      {giderModal.expenses.map((g, idx) => (
                        <li key={g.id + "-" + idx}>
                          {g.desc || "Gider"} - {formatPrice(g.amount)}
                          {g.paymentDate
                            ? ` (${format(
                                new Date(g.paymentDate),
                                "dd.MM.yyyy"
                              )})`
                            : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {giderModal.payments.length === 0 &&
                  giderModal.expenses.length === 0 && (
                    <div>Gider veya ödeme bulunamadı.</div>
                  )}
              </div>
              <button
                className="mt-6 w-full bg-blue-600 text-white py-2 rounded"
                onClick={() => setGiderModal(null)}
              >
                Kapat
              </button>
            </div>
          </div>
        )}
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
