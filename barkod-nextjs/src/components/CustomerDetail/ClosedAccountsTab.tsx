import React, { useState } from "react";
import { Customer, Debt, CustomerPayment, SubCustomer } from "../../types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import DebtDetailsModal from "./DebtDetailsModal";
import { subCustomerService } from "../../services/subCustomerService";

interface ClosedAccountsTabProps {
  customer: Customer;
  debts: Debt[];
  payments: CustomerPayment[];
  subCustomers: SubCustomer[];
  onDataRefresh: () => void;
}

const ClosedAccountsTab: React.FC<ClosedAccountsTabProps> = ({
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

  // Arama input değişikliği
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  // Arama temizleme
  const clearSearch = () => {
    setSearchTerm("");
  };

  // En son tarihi hesapla
  const getLatestDate = (customerId: string) => {
    const customerDebts = debts.filter(
      (d) =>
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

  // Kapanmış hesapları hazırla
  const closedAccounts = subCustomers
    .filter((sc) => sc.status === "inactive")
    .filter((sc) => {
      if (!searchTerm.trim()) return true;
      return (
        sc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sc.phone && sc.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    })
    .map((sc) => {
      // Bu alt müşteriye ait borçları hesapla
      const scDebts = debts.filter(
        (d) =>
          d.subCustomerId === sc.id ||
          (typeof d.subCustomerId === "object" &&
            d.subCustomerId?._id === sc.id)
      );

      // Bu alt müşteriye ait ödemeleri hesapla
      const scPayments = payments.filter(
        (p) =>
          p.subCustomerId === sc.id ||
          (typeof p.subCustomerId === "object" &&
            p.subCustomerId?._id === sc.id)
      );

      const totalDebt = scDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
      const totalPaid = scPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining = Math.max(0, totalDebt - totalPaid);

      // Ürün bilgilerini hesapla
      const productInfo = {
        barcodes: scDebts
          .map((debt) => {
            if (debt.saleId && typeof debt.saleId === "object") {
              if (debt.saleId.items && Array.isArray(debt.saleId.items)) {
                return debt.saleId.items.map((item) => item.barcode).join(", ");
              } else if (debt.saleId.barcode) {
                return debt.saleId.barcode;
              }
            }
            return "";
          })
          .filter(Boolean)
          .join(", "),
        productNames: scDebts
          .map((debt) => {
            if (debt.saleId && typeof debt.saleId === "object") {
              if (debt.saleId.items && Array.isArray(debt.saleId.items)) {
                return debt.saleId.items
                  .map((item) => item.productName)
                  .join(", ");
              }
            }
            return "";
          })
          .filter(Boolean)
          .join(", "),
        totalQuantity: scDebts.reduce((sum, debt) => {
          if (debt.saleId && typeof debt.saleId === "object") {
            if (debt.saleId.items && Array.isArray(debt.saleId.items)) {
              return (
                sum +
                debt.saleId.items.reduce(
                  (itemSum, item) => itemSum + (item.quantity || 1),
                  0
                )
              );
            }
          }
          return sum + 1;
        }, 0),
      };

      return {
        id: sc.id,
        name: sc.name,
        phone: sc.phone,
        totalDebt,
        totalPaid,
        remaining,
        status: "Kapalı",
        type: "sub",
        productInfo,
        customerId: sc.customerId,
      };
    });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3 flex-shrink-0">
        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1 md:mb-0">
          Kapanmış Hesaplar
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Alt müşteri ara (ad veya telefon)..."
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
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Tarih
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Ad
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Ürün Kodu
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Ürün Adı
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Adet
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Toplam Borç
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Ödenen
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  Kalan
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody>
              {closedAccounts.map((account) => (
                <tr
                  key={account.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
                  onClick={() => {
                    const accountDebts = debts.filter(
                      (d) =>
                        d.subCustomerId === account.id ||
                        (typeof d.subCustomerId === "object" &&
                          d.subCustomerId?._id === account.id)
                    );

                    const accountPayments = payments.filter(
                      (p) =>
                        p.subCustomerId === account.id ||
                        (typeof p.subCustomerId === "object" &&
                          p.subCustomerId?._id === account.id)
                    );

                    setDetailsModal({
                      isOpen: true,
                      customerName: account.name,
                      customerPhone: account.phone,
                      debts: accountDebts,
                      payments: accountPayments,
                      type: "debt",
                    });
                  }}
                >
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300 text-xs">
                    {getLatestDate(account.id)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                    {account.name}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                    {account.productInfo?.barcodes || "-"}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                    {account.productInfo?.productNames || "-"}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                    {account.productInfo?.totalQuantity || 0}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                    {account.totalDebt.toFixed(2)} ₺
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-semibold">
                    {account.totalPaid.toFixed(2)} ₺
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-orange-600 font-semibold">
                    {account.remaining.toFixed(2)} ₺
                  </td>
                  <td
                    className="border border-gray-300 dark:border-gray-600 px-2 py-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="px-3 py-1 bg-green-600 text-white text-xs hover:bg-green-700 transition-colors cursor-pointer rounded"
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();

                        try {
                          // Hesap açma işlemi
                          await subCustomerService.openAccount(account.id);
                          console.log("Hesap açıldı:", account.id);

                          // Sayfayı yenile
                          if (onDataRefresh) {
                            // Kısa bir gecikme ekle ki veriler güncellensin
                            setTimeout(() => {
                              onDataRefresh();
                            }, 500);
                          }

                          alert("Hesap başarıyla açıldı!");
                        } catch (error) {
                          console.error("Hesap açma hatası:", error);
                          alert("Hesap açılırken bir hata oluştu!");
                        }
                      }}
                    >
                      Hesabı Aç
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

export default ClosedAccountsTab;
