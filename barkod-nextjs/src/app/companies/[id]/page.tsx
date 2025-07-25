"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Building2, Phone, MapPin, ArrowLeft, X } from "lucide-react";
import { companyService } from "../../../services/companyService";
import { productService } from "../../../services/productService";
import { paymentService } from "../../../services/paymentService";
import { Product, Payment } from "../../../types";

interface Company {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  _id?: string;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("nakit");

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await companyService.getById(id);
        setCompany(data);

        // Ürünleri çek
        try {
          const allProducts = await productService.getAll();
          console.log("Tüm ürünler:", allProducts);
          console.log("Firma adı:", data.name);
          console.log("Firma ID:", id);

          const filteredProducts = allProducts.filter((p) => {
            console.log("Ürün:", p.name, "Supplier:", p.supplier);
            // Hem firma adına hem de firma ID'sine göre kontrol et
            return (
              Array.isArray(p.supplier) &&
              (p.supplier.includes(data.name) || p.supplier.includes(id))
            );
          });

          console.log("Filtrelenmiş ürünler:", filteredProducts);
          setProducts(filteredProducts);
        } catch (error) {
          console.error("Ürünler yüklenirken hata:", error);
          setProducts([]);
        }

        // Ödemeleri çek
        try {
          const allPayments = await paymentService.getAll();
          setPayments(
            allPayments.filter(
              (p) => p.company === data.name || p.company === id
            )
          );
        } catch (error) {
          console.error("Ödemeler yüklenirken hata:", error);
          setPayments([]);
        }
      } catch (error) {
        console.error("Firma yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Ödemeleri ayır
  const completedPayments = payments.filter((p) => p.isPaid);
  const pendingPayments = payments.filter((p) => !p.isPaid);

  // Toplam hesaplamalar
  const totalProductValue = products.reduce(
    (sum, p) => sum + (p.purchasePrice || p.price || 0) * (p.stock || 0),
    0
  );
  const totalCompletedPayments = completedPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const totalPendingPayments = pendingPayments.reduce(
    (sum, p) => sum + (p.amount || 0),
    0
  );
  const balance = totalProductValue + totalPendingPayments;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-600" />
            {company?.name || "Firma"}
          </h2>
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
          ) : !company ? (
            <div className="text-center text-red-500 py-8">
              Firma bulunamadı.
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-primary-600" />
                  <span>Telefon: {company.phone || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  <span>Adres: {company.address || "-"}</span>
                </div>
              </div>

              {/* Finansal Özet */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Toplam Alış:</span>
                  <span className="text-danger-600 font-bold">
                    {totalProductValue.toFixed(2)} ₺
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Yapılan Ödemeler:</span>
                  <span className="text-success-600 font-bold">
                    {totalCompletedPayments.toFixed(2)} ₺
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Bekleyen Ödemeler:</span>
                  <span className="text-warning-600 font-bold">
                    {totalPendingPayments.toFixed(2)} ₺
                  </span>
                </div>
                <div className="flex justify-between mb-4">
                  <span className="font-semibold">Toplam Borç:</span>
                  <span
                    className={
                      balance > 0
                        ? "text-danger-600 font-bold"
                        : "text-success-600 font-bold"
                    }
                  >
                    {balance.toFixed(2)} ₺
                  </span>
                </div>

                {/* Borç Ödeme Alanı */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">
                    Borç Ödeme
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="Tutar"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="nakit">Nakit</option>
                      <option value="kredi kartı">Kredi Kartı</option>
                      <option value="havale">Havale/EFT</option>
                      <option value="diğer">Diğer</option>
                    </select>
                    <button
                      onClick={async () => {
                        if (!paymentAmount || parseFloat(paymentAmount) <= 0)
                          return;

                        try {
                          await paymentService.create({
                            company: company.name,
                            name: "",
                            amount: parseFloat(paymentAmount),
                            date: new Date().toISOString(),
                            paymentType: paymentType,
                            isPaid: true,
                            id:
                              Date.now().toString() +
                              Math.random().toString(36).slice(2),
                          });

                          // Ödemeleri yeniden yükle
                          const allPayments = await paymentService.getAll();
                          setPayments(
                            allPayments.filter(
                              (p) =>
                                p.company === company.name || p.company === id
                            )
                          );

                          setPaymentAmount("");
                          setPaymentType("nakit");
                        } catch (error) {
                          console.error("Ödeme eklenirken hata:", error);
                        }
                      }}
                      className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm"
                    >
                      Ödeme Ekle
                    </button>
                  </div>
                </div>
              </div>

              {/* Ürünler */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-primary-700 dark:text-primary-300">
                  Bu Firmadan Alınan Ürünler ({products.length})
                </h3>
                {products.length === 0 ? (
                  <div className="text-gray-400 text-sm">Ürün yok.</div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {products.map((p) => (
                      <div
                        key={p.id || p._id}
                        className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 py-2 last:border-b-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => {
                          // Ürün detay modalını aç
                          setSelectedProduct(p);
                          setShowProductModal(true);
                        }}
                      >
                        <span className="text-sm">
                          {p.name}{" "}
                          <span className="text-xs text-gray-400">
                            ({p.barcode})
                          </span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 ml-2">
                            {p.stock || 0} adet
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {p.purchasePrice || p.price} ₺
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Yapılan Ödemeler */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2 text-success-700 dark:text-success-300">
                  Yapılan Ödemeler ({completedPayments.length})
                </h3>
                {completedPayments.length === 0 ? (
                  <div className="text-gray-400 text-sm">
                    Yapılan ödeme yok.
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {completedPayments.map((pay) => (
                      <div
                        key={pay.id || pay._id}
                        className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 py-2 last:border-b-0"
                      >
                        <span className="text-sm">
                          {pay.amount} ₺{" "}
                          <span className="text-xs text-gray-400">
                            (
                            {pay.date
                              ? new Date(pay.date).toLocaleDateString("tr-TR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                            )
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-success-600">
                          {pay.paymentType || "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bekleyen Ödemeler */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-warning-700 dark:text-warning-300">
                  Bekleyen Ödemeler ({pendingPayments.length})
                </h3>
                {pendingPayments.length === 0 ? (
                  <div className="text-gray-400 text-sm">
                    Bekleyen ödeme yok.
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {pendingPayments.map((pay) => (
                      <div
                        key={pay.id || pay._id}
                        className="flex justify-between items-center border-b border-gray-200 dark:border-gray-600 py-2 last:border-b-0"
                      >
                        <span className="text-sm">
                          {pay.amount} ₺{" "}
                          <span className="text-xs text-gray-400">
                            (
                            {pay.date
                              ? new Date(pay.date).toLocaleDateString("tr-TR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                            )
                          </span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-warning-600">
                            {pay.paymentType || "-"}
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                await paymentService.update(
                                  pay.id || pay._id || "",
                                  { isPaid: !pay.isPaid }
                                );
                                // Ödemeleri yeniden yükle
                                const allPayments =
                                  await paymentService.getAll();
                                setPayments(
                                  allPayments.filter(
                                    (p) =>
                                      p.company === company.name ||
                                      p.company === id
                                  )
                                );
                              } catch (error) {
                                console.error(
                                  "Ödeme güncellenirken hata:",
                                  error
                                );
                              }
                            }}
                            className={`px-2 py-1 rounded text-xs transition-colors ${
                              pay.isPaid
                                ? "bg-green-600 text-white hover:bg-green-700"
                                : "bg-red-600 text-white hover:bg-red-700"
                            }`}
                          >
                            {pay.isPaid ? "Ödendi" : "Ödenmedi"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Ürün Detay Modalı */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
              {selectedProduct.name}
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">
                  Barkod:
                </span>
                <span className="font-mono">{selectedProduct.barcode}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Fiyat:</span>
                <span className="font-semibold">
                  ₺{selectedProduct.price?.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Stok:</span>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedProduct.stock === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                      : selectedProduct.stock <= 5
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                  }`}
                >
                  {selectedProduct.stock === 0
                    ? "Tükendi"
                    : selectedProduct.stock + " adet"}
                </span>
              </div>

              {selectedProduct.category && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Kategori:
                  </span>
                  <span>{selectedProduct.category}</span>
                </div>
              )}

              {selectedProduct.brand && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Marka:
                  </span>
                  <span>{selectedProduct.brand}</span>
                </div>
              )}

              {selectedProduct.oem && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">OEM:</span>
                  <span>{selectedProduct.oem}</span>
                </div>
              )}

              {selectedProduct.kod1 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Kod 1:
                  </span>
                  <span>{selectedProduct.kod1}</span>
                </div>
              )}

              {selectedProduct.kod2 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Kod 2:
                  </span>
                  <span>{selectedProduct.kod2}</span>
                </div>
              )}

              {selectedProduct.usedCars &&
                selectedProduct.usedCars.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">
                      Kullanılan Araçlar:
                    </span>
                    <span className="text-right">
                      {selectedProduct.usedCars.join(", ")}
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
