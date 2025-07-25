"use client";
import React, { useState } from "react";
import { Sale } from "../types";
import { TrendingUp, Calendar, Package, DollarSign } from "lucide-react";
import { format, isToday, parseISO } from "date-fns";

interface SalesHistoryProps {
  sales: Sale[];
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales }) => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const todaySales = sales.filter((sale) => isToday(parseISO(sale.soldAt)));
  const selectedDateSales = sales.filter((sale) =>
    sale.soldAt.startsWith(selectedDate)
  );

  const todayStats = {
    totalSales: todaySales.reduce((sum, sale) => sum + (sale.total ?? 0), 0),
    totalItems: todaySales.reduce((sum, sale) => sum + (sale.quantity ?? 0), 0),
    transactions: todaySales.length,
  };

  const selectedDateStats = {
    totalSales: selectedDateSales.reduce(
      (sum, sale) => sum + (sale.total ?? 0),
      0
    ),
    totalItems: selectedDateSales.reduce(
      (sum, sale) => sum + (sale.quantity ?? 0),
      0
    ),
    transactions: selectedDateSales.length,
  };

  const formatPrice = (price: number | undefined) => {
    price = price ?? 0;
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(price);
  };

  const formatTime = (dateStr: string) => {
    return format(parseISO(dateStr), "HH:mm");
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h2 className="text-xl font-semibold text-gray-800">Satış Geçmişi</h2>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">
                Bugünkü Satış
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatPrice(todayStats.totalSales)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Satılan Ürün</p>
              <p className="text-2xl font-bold text-blue-700">
                {todayStats.totalItems}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">
                İşlem Sayısı
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {todayStats.transactions}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tarih Seçin:
        </label>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {selectedDate !== new Date().toISOString().split("T")[0] && (
            <div className="text-sm text-gray-600">
              {selectedDateStats.transactions} işlem -{" "}
              {formatPrice(selectedDateStats.totalSales)}
            </div>
          )}
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {selectedDateSales.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Seçilen tarihte satış bulunamadı</p>
          </div>
        ) : (
          selectedDateSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {sale.productName}
                </div>
                <div className="text-sm text-gray-500 font-mono">
                  {sale.barcode}
                </div>
              </div>

              <div className="text-right">
                <div className="font-medium text-gray-800">
                  {sale.quantity} x {formatPrice(sale.price)} ={" "}
                  {formatPrice(sale.total)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatTime(sale.soldAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SalesHistory;
