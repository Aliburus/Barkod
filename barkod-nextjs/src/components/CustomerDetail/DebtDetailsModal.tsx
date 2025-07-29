import React from "react";
import { Debt, CustomerPayment } from "../../types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  customerPhone?: string;
  debts: Debt[];
  payments: CustomerPayment[];
  type: "debt" | "payment";
}

const DebtDetailsModal: React.FC<DebtDetailsModalProps> = ({
  isOpen,
  onClose,
  customerName,
  customerPhone,
  debts,
  payments,
  type,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {customerName} - Borç ve Ödeme Detayları
            {customerPhone && (
              <span className="block text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                📞 {customerPhone}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          {type === "debt" ? (
            // Borç ve ödeme detayları
            <div>
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Tüm İşlem Detayları
                </h4>
                {debts.length === 0 && payments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    İşlem kaydı bulunamadı.
                  </p>
                ) : (
                  <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Tarih
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
                          Tutar
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Ödeme Tipi
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Açıklama
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Tüm kayıtları birleştir ve tarihe göre sırala
                        const allRecords: Array<{
                          type: "debt" | "payment";
                          date: string;
                          debt?: Debt;
                          payment?: CustomerPayment;
                          item?: {
                            barcode?: string;
                            productName?: string;
                            quantity?: number;
                            price?: number;
                          };
                          isFirstItem?: boolean;
                        }> = [];

                        // Borç kayıtlarını ekle
                        debts.forEach((debt) => {
                          let items: Array<{
                            barcode?: string;
                            productName?: string;
                            quantity?: number;
                            price?: number;
                          }> = [];

                          if (
                            debt.saleId &&
                            typeof debt.saleId === "object" &&
                            debt.saleId.items &&
                            Array.isArray(debt.saleId.items)
                          ) {
                            items = debt.saleId.items;
                          } else if (
                            debt.saleId &&
                            typeof debt.saleId === "object" &&
                            debt.saleId.barcode
                          ) {
                            items = [
                              {
                                barcode: debt.saleId.barcode,
                                productName: debt.saleId.productName || "-",
                                quantity: debt.saleId.quantity || 1,
                                price: debt.saleId.price || 0,
                              },
                            ];
                          }

                          if (items.length > 0) {
                            items.forEach((item, index) => {
                              allRecords.push({
                                type: "debt",
                                date: debt.createdAt,
                                debt,
                                item,
                                isFirstItem: index === 0,
                              });
                            });
                          } else {
                            allRecords.push({
                              type: "debt",
                              date: debt.createdAt,
                              debt,
                            });
                          }
                        });

                        // Ödeme kayıtlarını ekle
                        payments.forEach((payment) => {
                          allRecords.push({
                            type: "payment",
                            date: payment.paymentDate,
                            payment,
                          });
                        });

                        // Tarihe göre sırala (en yeni en üstte)
                        allRecords.sort(
                          (a, b) =>
                            new Date(b.date).getTime() -
                            new Date(a.date).getTime()
                        );

                        return allRecords.map((record, index) => {
                          if (record.type === "debt") {
                            const { debt, item, isFirstItem } = record;

                            if (item) {
                              return (
                                <tr
                                  key={`debt-${debt!._id}-${index}`}
                                  className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                    {isFirstItem &&
                                      format(
                                        parseISO(debt!.createdAt),
                                        "dd.MM.yy HH:mm",
                                        { locale: tr }
                                      )}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {item.barcode || "-"}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {item.productName || "-"}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {item.quantity || 1}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                                    {(
                                      (item.price || 0) * (item.quantity || 1)
                                    ).toFixed(2)}{" "}
                                    ₺
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {isFirstItem && (debt!.description || "-")}
                                  </td>
                                </tr>
                              );
                            } else {
                              return (
                                <tr
                                  key={debt!._id}
                                  className="hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                    {format(
                                      parseISO(debt!.createdAt),
                                      "dd.MM.yy HH:mm",
                                      { locale: tr }
                                    )}
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-red-600 font-semibold">
                                    {debt!.amount.toFixed(2)} ₺
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    -
                                  </td>
                                  <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                    {debt!.description || "-"}
                                  </td>
                                </tr>
                              );
                            }
                          } else {
                            const { payment } = record;
                            return (
                              <tr
                                key={`payment-${payment!._id}`}
                                className="hover:bg-green-50 dark:hover:bg-green-900/20"
                              >
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                                  {format(
                                    parseISO(payment!.paymentDate),
                                    "dd.MM.yy HH:mm",
                                    { locale: tr }
                                  )}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                  -
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                  -
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                  -
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-semibold">
                                  {payment!.amount.toFixed(2)} ₺
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                  {payment!.paymentType === "nakit"
                                    ? "Nakit"
                                    : payment!.paymentType === "kredi_karti"
                                    ? "Kredi Kartı"
                                    : payment!.paymentType === "havale"
                                    ? "Havale"
                                    : payment!.paymentType === "cek"
                                    ? "Çek"
                                    : payment!.paymentType === "diger"
                                    ? "Diğer"
                                    : payment!.paymentType}
                                </td>
                                <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                                  {payment!.description || "-"}
                                </td>
                              </tr>
                            );
                          }
                        });
                      })()}
                    </tbody>
                  </table>
                )}

                {/* Genel Özet */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Genel Özet
                  </h5>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Toplam Borç:
                      </span>
                      <span className="ml-2 font-semibold text-red-600">
                        {debts
                          .reduce((sum, d) => sum + (d.amount || 0), 0)
                          .toFixed(2)}{" "}
                        ₺
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Toplam Ödeme:
                      </span>
                      <span className="ml-2 font-semibold text-green-600">
                        {payments
                          .reduce((sum, p) => sum + (p.amount || 0), 0)
                          .toFixed(2)}{" "}
                        ₺
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Kalan:
                      </span>
                      <span className="ml-2 font-semibold text-orange-600">
                        {(
                          debts.reduce((sum, d) => sum + (d.amount || 0), 0) -
                          payments.reduce((sum, p) => sum + (p.amount || 0), 0)
                        ).toFixed(2)}{" "}
                        ₺
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Sadece ödeme detayları (type === "payment" için)
            <div>
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Ödeme Kayıtları
                </h4>
                {payments.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    Ödeme kaydı bulunamadı.
                  </p>
                ) : (
                  <table className="w-full text-xs border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Tarih
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Tutar
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Ödeme Tipi
                        </th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">
                          Açıklama
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr
                          key={payment._id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-600 dark:text-gray-400">
                            {format(
                              parseISO(payment.paymentDate),
                              "dd.MM.yy HH:mm",
                              { locale: tr }
                            )}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-green-600 font-semibold">
                            {payment.amount.toFixed(2)} ₺
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                            {payment.paymentType === "nakit"
                              ? "Nakit"
                              : payment.paymentType === "kredi_karti"
                              ? "Kredi Kartı"
                              : payment.paymentType === "havale"
                              ? "Havale"
                              : payment.paymentType === "cek"
                              ? "Çek"
                              : payment.paymentType === "diger"
                              ? "Diğer"
                              : payment.paymentType}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-gray-700 dark:text-gray-300">
                            {payment.description || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                <h5 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  Ödeme Özeti
                </h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Toplam Ödeme:
                    </span>
                    <span className="ml-2 font-semibold text-green-600">
                      {payments
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toFixed(2)}{" "}
                      ₺
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Ortalama:
                    </span>
                    <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                      {payments.length > 0
                        ? (
                            payments.reduce(
                              (sum, p) => sum + (p.amount || 0),
                              0
                            ) / payments.length
                          ).toFixed(2)
                        : "0.00"}{" "}
                      ₺
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebtDetailsModal;
