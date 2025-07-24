"use client";
import React, { useState } from "react";
import { Product, Sale } from "../../types";
import { parseISO, format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface AnalyticsPageProps {
  products: Product[];
  sales: Sale[];
  showTotalValue: boolean;
}

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  products,
  sales,
  showTotalValue,
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

  return (
    <div className="space-y-6">
      {/* Stock Analysis */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Stok Durumu
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Toplam Ürün
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {stockAnalysis.total}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-success-600">Normal Stok</span>
            <span className="font-semibold text-success-600">
              {stockAnalysis.inStock}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-warning-600">Az Stok</span>
            <span className="font-semibold text-warning-600">
              {stockAnalysis.lowStock}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-danger-600">Tükenen</span>
            <span className="font-semibold text-danger-600">
              {stockAnalysis.outOfStock}
            </span>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Toplam Stok Değeri
            </span>
            {showTotalValue ? (
              <span className="font-bold text-primary-600">
                {formatPrice(stockAnalysis.totalValue)}
              </span>
            ) : (
              <span className="font-bold text-primary-600 select-none tracking-widest">
                ***
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Top Products and Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            En Çok Satan Ürünler
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {topProducts.slice(0, 6).map((product, index) => (
              <div
                key={product.name}
                className="flex flex-col justify-between bg-gradient-to-br from-primary-50/80 to-primary-100 dark:from-primary-900/40 dark:to-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-2xl p-5 shadow-lg hover:scale-105 transition-transform duration-200 min-h-[160px]"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-7 h-7 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-base font-bold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-base truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                      {product.barcode}
                    </p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end items-end gap-1 mt-2">
                  <p className="font-bold text-gray-900 dark:text-white text-lg">
                    {product.quantity}{" "}
                    <span className="font-normal text-base">adet</span>
                  </p>
                  {showTotalValue ? (
                    <p className="text-sm text-success-600 font-semibold">
                      {formatPrice(product.revenue)}
                    </p>
                  ) : (
                    <p className="text-sm text-success-600 select-none tracking-widest font-semibold">
                      ***
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Category Analysis */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            En Çok Satılan Kategoriler
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {categorySales.slice(0, 6).map((category) => (
              <div
                key={category.category}
                className="flex flex-col justify-between bg-gradient-to-br from-gray-50/80 to-gray-100 dark:from-gray-900/40 dark:to-gray-900/10 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-lg hover:scale-105 transition-transform duration-200 min-h-[140px]"
              >
                <div className="mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate text-base">
                    {category.category}
                  </h4>
                </div>
                <div className="flex-1 flex flex-col justify-end gap-1 mt-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Toplam Satış{" "}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {category.quantity} adet
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Toplam Gelir{" "}
                    </span>
                    {showTotalValue ? (
                      <span className="font-bold text-primary-600">
                        {formatPrice(category.revenue)}
                      </span>
                    ) : (
                      <span className="font-bold text-primary-600 select-none tracking-widest">
                        ***
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Charts Row */}
      {/* Satış Grafiği */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Aylara Göre Satışlar
          </h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="ml-4 p-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={chartData}
            margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{
                fontSize: 16,
                fill: "#374151",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 16,
                fill: "#374151",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={false}
              tickFormatter={(value) =>
                showTotalValue
                  ? new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(Number(value))
                  : "***"
              }
              width={90}
            />
            <Tooltip
              formatter={(value) =>
                showTotalValue
                  ? new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(Number(value))
                  : "***"
              }
              separator=": "
            />
            <Bar
              dataKey="GELİR"
              fill="#6366f1"
              radius={[8, 8, 0, 0]}
              name="GELİR"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Kategoriye göre satış dağılımı PieChart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Kategoriye Göre Satış Dağılımı
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, value }) =>
                `${name}: ${
                  showTotalValue
                    ? new Intl.NumberFormat("tr-TR", {
                        style: "currency",
                        currency: "TRY",
                      }).format(Number(value))
                    : "***"
                }`
              }
            >
              {pieData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={pieColors[idx % pieColors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                showTotalValue
                  ? new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(Number(value))
                  : "***"
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Haftalık satış trendi LineChart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Haftalık Satış Trendi
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart
            data={lineData}
            margin={{ top: 16, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{
                fontSize: 16,
                fill: "#374151",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={false}
            />
            <YAxis
              tick={{
                fontSize: 16,
                fill: "#374151",
                fontFamily: "inherit",
                fontWeight: 600,
              }}
              axisLine={{ stroke: "#d1d5db" }}
              tickLine={false}
              tickFormatter={(value) =>
                showTotalValue
                  ? new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(Number(value))
                  : "***"
              }
              width={90}
            />
            <Tooltip
              formatter={(value) =>
                showTotalValue
                  ? new Intl.NumberFormat("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    }).format(Number(value))
                  : "***"
              }
              separator=": "
            />
            <Line
              type="monotone"
              dataKey="GELİR"
              stroke="#6366f1"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnalyticsPage;
