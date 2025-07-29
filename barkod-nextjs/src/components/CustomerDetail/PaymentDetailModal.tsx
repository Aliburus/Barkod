import React from "react";
import { CustomerPayment } from "../../types";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface PaymentDetailModalProps {
  payment: CustomerPayment | null;
  isOpen: boolean;
  onClose: () => void;
}

const PaymentDetailModal: React.FC<PaymentDetailModalProps> = ({
  payment,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !payment) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ödeme Detayı
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Tutar
              </label>
              <p className="text-lg font-semibold text-green-600">
                {payment.amount.toFixed(2)} ₺
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Ödeme Türü
              </label>
              <p className="text-gray-900 dark:text-white">
                {payment.paymentType === "nakit" && "Nakit"}
                {payment.paymentType === "kredi_karti" && "Kredi Kartı"}
                {payment.paymentType === "havale" && "Havale"}
                {payment.paymentType === "cek" && "Çek"}
                {payment.paymentType === "diger" && "Diğer"}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Ödeme Tarihi
            </label>
            <p className="text-gray-900 dark:text-white">
              {format(parseISO(payment.paymentDate), "dd MMMM yyyy HH:mm", {
                locale: tr,
              })}
            </p>
          </div>

          {payment.description && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Açıklama
              </label>
              <p className="text-gray-900 dark:text-white">
                {payment.description}
              </p>
            </div>
          )}

          {payment.receiptNumber && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Makbuz No
              </label>
              <p className="text-gray-900 dark:text-white">
                {payment.receiptNumber}
              </p>
            </div>
          )}

          {payment.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Notlar
              </label>
              <p className="text-gray-900 dark:text-white">{payment.notes}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Durum
            </label>
            <p
              className={`font-semibold ${
                payment.status === "active"
                  ? "text-green-600"
                  : payment.status === "cancelled"
                  ? "text-red-600"
                  : "text-orange-600"
              }`}
            >
              {payment.status === "active" && "Aktif"}
              {payment.status === "cancelled" && "İptal Edildi"}
              {payment.status === "refunded" && "İade Edildi"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetailModal;
