import React from "react";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";

interface SaleItem {
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
}

interface SalesTabProps {
  saleItems: SaleItem[];
}

const SalesTab: React.FC<SalesTabProps> = ({ saleItems }) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Tarih
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Ürün Kodu
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Adet
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Malzeme
              </th>
              <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2">
                Tutar
              </th>
            </tr>
          </thead>
          <tbody>
            {saleItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-400 py-8">
                  Satış yok
                </td>
              </tr>
            ) : (
              saleItems.map((item) => (
                <tr
                  key={item._id}
                  className="border-b border-gray-100 dark:border-gray-700"
                >
                  <td className="py-2 text-xs text-gray-400">
                    {format(parseISO(item.createdAt), "dd MMM yyyy HH:mm", {
                      locale: tr,
                    })}
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-300 font-mono text-xs">
                    {item.barcode || "-"}
                  </td>
                  <td className="py-2 text-gray-500 dark:text-gray-300">
                    {item.quantity || 0}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-white">
                    {item.productName || "Bilinmiyor"}
                  </td>
                  <td className="py-2 text-gray-900 dark:text-white">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">
                        {item.finalPrice?.toFixed(2)} ₺
                      </span>
                      {item.customPrice &&
                        item.customPrice !== item.originalPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            {item.originalPrice?.toFixed(2)} ₺
                          </span>
                        )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesTab;
