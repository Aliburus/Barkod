import React, { useState } from "react";
import { Customer, Debt, CustomerPayment, SubCustomer } from "../types";
import { customerService } from "../services/customerService";
import { debtService } from "../services/debtService";
import { customerPaymentService } from "../services/customerPaymentService";
import { subCustomerService } from "../services/subCustomerService";
import { saleItemService } from "../services/saleItemService";
import axios from "axios";

// Import the new components
import PaymentForm from "./CustomerDetail/PaymentForm";
import DebtsTab from "./CustomerDetail/DebtsTab";
import SalesTab from "./CustomerDetail/SalesTab";
import ClosedAccountsTab from "./CustomerDetail/ClosedAccountsTab";
import PaymentDetailModal from "./CustomerDetail/PaymentDetailModal";

const CustomerDetailModal = ({
  open,
  onClose,
  customer,
  fetchCustomers,
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  fetchCustomers?: () => void;
}) => {
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [payments, setPayments] = React.useState<CustomerPayment[]>([]);
  const [debtSummary, setDebtSummary] = React.useState<{
    totalDebt: number;
    totalPaid: number;
    remainingDebt: number;
  }>({ totalDebt: 0, totalPaid: 0, remainingDebt: 0 });
  const [saleItems, setSaleItems] = React.useState<
    Array<{
      _id: string;
      saleId:
        | string
        | {
            _id: string;
            items?: Array<{
              barcode: string;
              productName: string;
              quantity: number;
            }>;
            barcode?: string;
          };
      productId: string;
      barcode: string;
      productName: string;
      quantity: number;
      originalPrice: number;
      customPrice?: number;
      finalPrice: number;
      totalAmount: number;
      customerId: string;
      subCustomerId?: string;
      createdAt: string;
      updatedAt?: string;
    }>
  >([]);
  const [subCustomers, setSubCustomers] = React.useState<SubCustomer[]>([]);

  const [selectedPayment] = useState<CustomerPayment | null>(null);
  const [paymentDetailOpen, setPaymentDetailOpen] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<
    "debts" | "sales" | "closed_accounts"
  >("debts");

  React.useEffect(() => {
    if (customer) {
      // Borç bilgilerini getir
      debtService
        .getByCustomerId(customer.id)
        .then((data) => {
          // data hem object hem de array olabilir
          const debtsArray = Array.isArray(data) ? data : data.debts || [];
          setDebts(
            debtsArray.map((d) => ({
              ...d,
              createdAt: d.createdAt?.toString() ?? "",
              updatedAt: d.updatedAt?.toString() ?? undefined,
              dueDate: d.dueDate?.toString() ?? undefined,
            })) as Debt[]
          );

          // API'den gelen özet bilgileri kaydet
          if (!Array.isArray(data)) {
            setDebtSummary({
              totalDebt: data.totalDebt || 0,
              totalPaid: data.totalPaid || 0,
              remainingDebt: data.remainingDebt || 0,
            });
          }
        })
        .catch((error) => {
          console.error("Borç bilgileri getirilemedi:", error);
          setDebts([]); // Hata durumunda boş array
        });

      // Ödeme bilgilerini getir
      customerPaymentService
        .getByCustomerId(customer.id)
        .then((data) => {
          setPayments(data);
        })
        .catch((error) => {
          console.error("Ödeme bilgileri getirilemedi:", error);
        });

      // Satış bilgilerini getir
      axios
        .get(`/api/sales?customerId=${customer.id}`)
        .then(() => {
          // Sales data is not used currently
        })
        .catch((error) => {
          console.error("Satış bilgileri getirilemedi:", error);
        });

      // Sale items bilgilerini getir
      saleItemService
        .getByCustomerId(customer.id)
        .then((data) => {
          setSaleItems(data);
        })
        .catch((error) => {
          console.error("Satış kalemleri getirilemedi:", error);
          setSaleItems([]);
        });

      // Alt müşterileri getir
      subCustomerService
        .getByCustomerId(customer.id)
        .then((data) => {
          setSubCustomers(data);
        })
        .catch((error) => {
          console.error("Alt müşteriler getirilemedi:", error);
          setSubCustomers([]);
        });
    }
  }, [customer]);

  const handleColorChange = async (customerId: string, color: string) => {
    try {
      await customerService.update(customerId, { color });
      if (fetchCustomers) {
        fetchCustomers();
      }
    } catch (error) {
      console.error("Müşteri rengi güncellenirken hata:", error);
    }
  };

  const handlePaymentSuccess = () => {
    // Ödeme başarılı olduğunda verileri yenile
    if (customer) {
      debtService
        .getByCustomerId(customer.id)
        .then((data) => {
          const debtsArray = Array.isArray(data) ? data : data.debts || [];
          setDebts(
            debtsArray.map((d) => ({
              ...d,
              createdAt: d.createdAt?.toString() ?? "",
              updatedAt: d.updatedAt?.toString() ?? undefined,
              dueDate: d.dueDate?.toString() ?? undefined,
            })) as Debt[]
          );

          if (!Array.isArray(data)) {
            setDebtSummary({
              totalDebt: data.totalDebt || 0,
              totalPaid: data.totalPaid || 0,
              remainingDebt: data.remainingDebt || 0,
            });
          }
        })
        .catch((error) => {
          console.error("Borç bilgileri yenilenirken hata:", error);
        });

      customerPaymentService
        .getByCustomerId(customer.id)
        .then((data) => {
          setPayments(data);
        })
        .catch((error) => {
          console.error("Ödeme bilgileri yenilenirken hata:", error);
        });
    }
  };

  const handleDataRefresh = () => {
    // Verileri yenile
    if (customer) {
      // Borç verilerini tamamen yeniden yükle
      debtService
        .getByCustomerId(customer.id)
        .then((data) => {
          const debtsArray = Array.isArray(data) ? data : data.debts || [];
          setDebts(
            debtsArray.map((d) => ({
              ...d,
              createdAt: d.createdAt?.toString() ?? "",
              updatedAt: d.updatedAt?.toString() ?? undefined,
              dueDate: d.dueDate?.toString() ?? undefined,
            })) as Debt[]
          );

          if (!Array.isArray(data)) {
            setDebtSummary({
              totalDebt: data.totalDebt || 0,
              totalPaid: data.totalPaid || 0,
              remainingDebt: data.remainingDebt || 0,
            });
          }
        })
        .catch((error) => {
          console.error("Borç bilgileri yenilenirken hata:", error);
        });

      // Ödeme verilerini de yenile
      customerPaymentService
        .getByCustomerId(customer.id)
        .then((data) => {
          setPayments(data);
        })
        .catch((error) => {
          console.error("Ödeme bilgileri yenilenirken hata:", error);
        });
    }
    if (fetchCustomers) {
      fetchCustomers();
    }
  };

  if (!open || !customer) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            {/* Müşteri renk badge'i */}
            <span
              className={`inline-block w-6 h-6 rounded-full border-2 border-gray-300 transition-all duration-200 ${
                customer.color === "yellow"
                  ? "bg-yellow-400"
                  : customer.color === "red"
                  ? "bg-red-500"
                  : customer.color === "blue"
                  ? "bg-blue-500"
                  : "bg-gray-200"
              }`}
            ></span>
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {customer.name}
                </span>
                {/* Renk seçme butonları */}
                <span className="flex items-center gap-2 ml-2">
                  {["yellow", "red", "blue"].map((color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChange(customer.id, color)}
                      className={`w-5 h-5 rounded-full border-2 transition-all duration-200 flex items-center justify-center focus:outline-none ${
                        color === "yellow"
                          ? "bg-yellow-400 border-yellow-600"
                          : color === "red"
                          ? "bg-red-400 border-red-600"
                          : "bg-blue-400 border-blue-600"
                      } ${
                        customer.color === color
                          ? "ring-2 ring-blue-500 scale-110 shadow-lg"
                          : "hover:scale-110 opacity-80"
                      }`}
                      style={{
                        boxShadow:
                          customer.color === color
                            ? "0 0 0 2px #fff"
                            : undefined,
                      }}
                      title={color}
                    />
                  ))}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-300 truncate">
                {customer.phone || "-"} • {customer.address || "-"}
              </div>
            </div>
          </div>

          <div className="flex flex-row gap-8 flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Tüm Borç
              </span>
              <span className="font-bold text-lg text-red-500">
                {debtSummary.totalDebt.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ödenen Borç
              </span>
              <span className="font-bold text-lg text-green-500">
                {debtSummary.totalPaid.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Kalan Borç
              </span>
              <span
                className={`font-bold text-lg ${
                  debtSummary.remainingDebt > 0
                    ? "text-orange-500"
                    : "text-green-500"
                }`}
              >
                {debtSummary.remainingDebt > 0
                  ? `${debtSummary.remainingDebt.toFixed(2)} ₺`
                  : "Ödendi ✓"}
              </span>
            </div>
          </div>
        </div>

        {/* Kapatma Butonu - Sağ Üst */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 z-10"
          title="Kapat"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Ödeme Alma Alanı - Yeni Component */}
        <PaymentForm
          customer={customer}
          debts={debts}
          payments={payments}
          subCustomers={subCustomers}
          debtSummary={debtSummary}
          onPaymentSuccess={handlePaymentSuccess}
          fetchCustomers={fetchCustomers}
        />

        {/* Alt ana içerik */}
        <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-8 px-4 md:px-6 pb-6 pt-4 overflow-y-auto">
          {/* Tab'lar */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-700 pr-0 md:pr-8 overflow-hidden">
            {/* Tab başlıkları */}
            <div className="flex gap-1 mb-3 flex-shrink-0">
              <button
                onClick={() => setActiveTab("debts")}
                className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
                  activeTab === "debts"
                    ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
                    : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
                }`}
              >
                Borçlar ({debts.filter((d) => !d.isPaid).length})
              </button>
              <button
                onClick={() => setActiveTab("sales")}
                className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
                  activeTab === "sales"
                    ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
                    : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
                }`}
              >
                Satışlar ({saleItems.length})
              </button>
              <button
                onClick={() => setActiveTab("closed_accounts")}
                className={`px-4 py-2 rounded-t-lg font-semibold border-b-2 transition-colors ${
                  activeTab === "closed_accounts"
                    ? "border-primary-600 text-primary-700 dark:text-primary-300 bg-white dark:bg-gray-800"
                    : "border-transparent text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900"
                }`}
              >
                Kapanmış Hesaplar (
                {subCustomers.filter((sc) => sc.status === "inactive").length})
              </button>
            </div>

            {/* Tab içerikleri - Yeni Component'ler */}
            {activeTab === "debts" && (
              <DebtsTab
                customer={customer}
                debts={debts}
                payments={payments}
                subCustomers={subCustomers}
                debtSummary={debtSummary}
                onDataRefresh={handleDataRefresh}
              />
            )}

            {activeTab === "sales" && (
              <SalesTab
                saleItems={saleItems}
                customerId={customer?.id}
                subCustomerId={undefined}
              />
            )}

            {activeTab === "closed_accounts" && (
              <ClosedAccountsTab
                customer={customer}
                debts={debts}
                payments={payments}
                subCustomers={subCustomers}
                onDataRefresh={handleDataRefresh}
              />
            )}
          </div>
        </div>
      </div>

      {/* Ödeme Detay Popup - Yeni Component */}
      <PaymentDetailModal
        payment={selectedPayment}
        isOpen={paymentDetailOpen}
        onClose={() => setPaymentDetailOpen(false)}
      />
    </div>
  );
};

export default CustomerDetailModal;
