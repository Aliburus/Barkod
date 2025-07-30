import React, { useState } from "react";
import { Customer, Debt, CustomerPayment, SubCustomer } from "../../types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import DebtDetailsModal from "./DebtDetailsModal";
import { subCustomerService } from "../../services/subCustomerService";

import Notification from "../Layout/Notification";

interface DebtsTabProps {
  customer: Customer;
  debts: Debt[];
  payments: CustomerPayment[];
  subCustomers: SubCustomer[];
  debtSummary: {
    totalDebt: number;
    totalPaid: number;
    remainingDebt: number;
  };
  onDataRefresh: () => void;
}

const DebtsTab: React.FC<DebtsTabProps> = ({
  customer,
  debts,
  payments,
  subCustomers,
  onDataRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    customerName: string;
    customerPhone?: string;
    debts: Debt[];
    payments: CustomerPayment[];
    type: "debt" | "payment";
  }>({
    isOpen: false,
    customerName: "",
    customerPhone: "",
    debts: [],
    payments: [],
    type: "debt",
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  // Ana müşteri borçları ve ödemeleri
  const mainCustomerDebts = (debts || []).filter(
    (d) => !d.subCustomerId || d.subCustomerId === ""
  );
  const mainCustomerPayments = (payments || []).filter(
    (p) => !p.subCustomerId || p.subCustomerId === ""
  );

  // Arama input değişikliği
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Arama temizleme
  const clearSearch = () => {
    setSearchTerm("");
  };

  // En son tarihi hesapla
  const getLatestDate = (customerId: string) => {
    const customerDebts = debts.filter(
      (d) =>
        (d.customerId === customerId && !d.subCustomerId) ||
        d.subCustomerId === customerId ||
        (typeof d.subCustomerId === "object" &&
          d.subCustomerId?._id === customerId)
    );

    if (customerDebts.length === 0) return "-";

    let latestDate: string | null = null;
    for (const debt of customerDebts) {
      if (debt.createdAt) {
        const debtDate = new Date(debt.createdAt);
        if (!latestDate || debtDate > new Date(latestDate)) {
          latestDate = debt.createdAt;
        }
      }
    }

    return latestDate
      ? format(parseISO(latestDate), "dd.MM.yyyy", { locale: tr })
      : "-";
  };

  // Tüm müşterileri (ana + alt müşteriler) tablo için hazırla
  const allCustomers = [
    // Ana müşteri
    {
      id: customer.id,
      name: customer.name,
      phone: customer.phone || "-",
      totalDebt: mainCustomerDebts
        .filter((d) => !d.isPaid) // Sadece ödenmemiş borçları hesapla
        .reduce((sum, d) => sum + (d.amount || 0), 0),
      totalPaid: mainCustomerPayments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      ),
      remaining:
        mainCustomerDebts
          .filter((d) => !d.isPaid) // Sadece ödenmemiş borçları hesapla
          .reduce((sum, d) => sum + (d.amount || 0), 0) -
        mainCustomerPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      status: "Açık",
      type: "Ana Müşteri",
      customerId: customer.id,
      // Ürün bilgilerini al
      productInfo: (() => {
        const customerDebts = debts.filter(
          (d) =>
            (d.customerId === customer.id && !d.subCustomerId) ||
            d.subCustomerId === customer.id ||
            (typeof d.subCustomerId === "object" &&
              d.subCustomerId?._id === customer.id)
        );

        const allItems: Array<{
          barcode?: string;
          productName?: string;
          quantity?: number;
        }> = [];

        customerDebts.forEach((debt) => {
          if (
            debt.saleId &&
            typeof debt.saleId === "object" &&
            debt.saleId.items &&
            Array.isArray(debt.saleId.items)
          ) {
            allItems.push(...debt.saleId.items);
          } else if (
            debt.saleId &&
            typeof debt.saleId === "object" &&
            debt.saleId.barcode
          ) {
            allItems.push({
              barcode: debt.saleId.barcode,
              productName: debt.saleId.productName || "-",
              quantity: debt.saleId.quantity || 1,
            });
          }
        });

        return {
          barcodes: allItems.map((item) => item.barcode || "-").join(", "),
          productNames: allItems
            .map((item) => item.productName || "-")
            .join(", "),
          totalQuantity: allItems.reduce(
            (sum, item) => sum + (item.quantity || 1),
            0
          ),
        };
      })(),
    },
    // Alt müşteriler
    ...subCustomers
      .filter((sc) => sc.status !== "inactive")
      .filter((sc) => {
        if (!searchTerm.trim()) return true;
        return (
          sc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (sc.phone &&
            sc.phone.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
      .map((sc) => {
        const scDebts = debts.filter(
          (d) =>
            d.subCustomerId === sc.id ||
            (typeof d.subCustomerId === "object" &&
              d.subCustomerId?._id === sc.id)
        );
        const scPayments = payments.filter(
          (p) =>
            p.subCustomerId === sc.id ||
            (typeof p.subCustomerId === "object" &&
              p.subCustomerId?._id === sc.id)
        );

        const totalDebt = scDebts
          .filter((d) => !d.isPaid) // Sadece ödenmemiş borçları hesapla
          .reduce((sum: number, d: Debt) => sum + (d.amount || 0), 0);
        const totalPaid = scPayments.reduce(
          (sum: number, p: CustomerPayment) => sum + (p.amount || 0),
          0
        );

        return {
          id: sc.id,
          name: sc.name,
          phone: sc.phone || "-",
          totalDebt,
          totalPaid,
          remaining: totalDebt - totalPaid,
          status: sc.status === "active" ? "Açık" : "Kapalı",
          type: "Alt Müşteri",
          customerId:
            typeof sc.customerId === "object"
              ? sc.customerId._id
              : sc.customerId,
          // Ürün bilgilerini al
          productInfo: (() => {
            const allItems: Array<{
              barcode?: string;
              productName?: string;
              quantity?: number;
            }> = [];

            scDebts.forEach((debt) => {
              if (
                debt.saleId &&
                typeof debt.saleId === "object" &&
                debt.saleId.items &&
                Array.isArray(debt.saleId.items)
              ) {
                allItems.push(...debt.saleId.items);
              } else if (
                debt.saleId &&
                typeof debt.saleId === "object" &&
                debt.saleId.barcode
              ) {
                allItems.push({
                  barcode: debt.saleId.barcode,
                  productName: debt.saleId.productName || "-",
                  quantity: debt.saleId.quantity || 1,
                });
              }
            });

            return {
              barcodes: allItems.map((item) => item.barcode || "-").join(", "),
              productNames: allItems
                .map((item) => item.productName || "-")
                .join(", "),
              totalQuantity: allItems.reduce(
                (sum, item) => sum + (item.quantity || 1),
                0
              ),
            };
          })(),
        };
      }),
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {notification && (
        <div className="flex justify-center mb-4">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 flex-shrink-0">
        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
          Borçlar (Müşterilere Göre)
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Müşteri ara (ad veya telefon)..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[250px]"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 sticky top-0 z-10">
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                Tarih
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                Ad
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                Toplam Borç
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                Ödenen
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                Kalan
              </th>
              <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">
                İşlem
              </th>
            </tr>
          </thead>
          <tbody>
            {allCustomers.map((customer) => (
              <tr
                key={customer.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
                onClick={() => {
                  const customerDebts = debts.filter(
                    (d) =>
                      (d.customerId === customer.id && !d.subCustomerId) ||
                      d.subCustomerId === customer.id ||
                      (typeof d.subCustomerId === "object" &&
                        d.subCustomerId?._id === customer.id)
                  );
                  const customerPayments = payments.filter(
                    (p) =>
                      (p.customerId === customer.id && !p.subCustomerId) ||
                      p.subCustomerId === customer.id ||
                      (typeof p.subCustomerId === "object" &&
                        p.subCustomerId?._id === customer.id)
                  );
                  setDetailsModal({
                    isOpen: true,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    debts: customerDebts,
                    payments: customerPayments,
                    type: "debt",
                  });
                }}
              >
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300 text-xs">
                  {getLatestDate(customer.id)}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-900 dark:text-white font-medium">
                  {customer.name}
                  {customer.type === "Ana Müşteri" && (
                    <span className="ml-2 text-xs text-gray-500">(Ana)</span>
                  )}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                  {customer.totalDebt.toFixed(2)} ₺
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-semibold">
                  {customer.totalPaid.toFixed(2)} ₺
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-orange-600 font-semibold">
                  {customer.remaining <= 0
                    ? "0.00 ₺"
                    : `${customer.remaining.toFixed(2)} ₺`}
                </td>
                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">
                  {customer.status === "Açık" && (
                    <button
                      className={`px-3 py-1 text-xs transition-colors cursor-pointer rounded ${
                        customer.remaining > 0
                          ? "bg-gray-400 text-white"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                      disabled={customer.remaining > 0}
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (customer.remaining > 0) {
                          setNotification({
                            message:
                              "Kalan borç varken hesap kapatılamaz. Lütfen önce borcu ödeyin.",
                            type: "warning",
                          });
                          return;
                        }
                        try {
                          // Borçları güncelle
                          const customerDebts = debts.filter(
                            (d) =>
                              (d.customerId === customer.id &&
                                !d.subCustomerId) ||
                              d.subCustomerId === customer.id ||
                              (typeof d.subCustomerId === "object" &&
                                d.subCustomerId?._id === customer.id)
                          );
                          for (const debt of customerDebts) {
                            try {
                              await fetch(`/api/debts/${debt._id}`, {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ isPaid: true }),
                              });
                            } catch (error) {
                              console.error("Borç güncelleme hatası:", error);
                            }
                          }
                          // Hesap kapatma işlemi
                          await subCustomerService.closeAccount(customer.id);
                          console.log("Hesap kapatıldı:", customer.id);
                          // Sayfayı yenile
                          if (onDataRefresh) {
                            setTimeout(() => {
                              onDataRefresh();
                            }, 500);
                          }
                          setNotification({
                            message: "Hesap başarıyla kapatıldı!",
                            type: "success",
                          });
                        } catch (error) {
                          console.error("Hesap kapatma hatası:", error);
                          setNotification({
                            message: "Hesap kapatılırken bir hata oluştu!",
                            type: "error",
                          });
                        }
                      }}
                    >
                      {customer.remaining > 0
                        ? "Borç Varken Kapatılamaz"
                        : "Hesabı Kapat"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detay Modal */}
      <DebtDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ ...detailsModal, isOpen: false })}
        customerName={detailsModal.customerName}
        customerPhone={detailsModal.customerPhone}
        debts={detailsModal.debts}
        payments={detailsModal.payments}
        type={detailsModal.type}
      />
    </div>
  );
};

export default DebtsTab;
