"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { X } from "lucide-react";
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

  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Ürünler için filtreleme ve sıralama state'leri
  const [productStartDate, setProductStartDate] = useState("");
  const [productEndDate, setProductEndDate] = useState("");
  const [productSort, setProductSort] = useState("date_desc"); // "date_desc", "date_asc", "amount_desc", "amount_asc"

  // Yapılan ödemeler için filtreleme ve sıralama state'leri
  const [completedStartDate, setCompletedStartDate] = useState("");
  const [completedEndDate, setCompletedEndDate] = useState("");
  const [completedSort, setCompletedSort] = useState("date_desc"); // "date_desc", "date_asc", "amount_desc", "amount_asc"

  // Bekleyen ödemeler için filtreleme ve sıralama state'leri
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");
  const [pendingSort, setPendingSort] = useState("date_desc"); // "date_desc", "date_asc", "amount_desc", "amount_asc"

  // Detay popup state'leri
  const [showOdemeDetail, setShowOdemeDetail] = useState(false);
  const [showBorcDetail, setShowBorcDetail] = useState(false);

  // Ödeme modal state'leri
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentModalForm, setPaymentModalForm] = useState({
    amount: "",
    description: "",
    paymentType: "nakit",
  });
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);

  // Ödemeleri yenileme fonksiyonu
  const refreshPayments = useCallback(async () => {
    if (!company) return;
    try {
      const allPayments = await paymentService.getAll();
      const filteredPayments = allPayments.filter(
        (p) => p.company === company.name || p.company === id
      );
      setPayments(filteredPayments);
    } catch (error) {
      console.error("Ödemeler yenilenirken hata:", error);
    }
  }, [company, id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        console.log("Firma ID:", id);

        // Firma bilgilerini çek
        const data = await companyService.getById(id);
        console.log("Firma verisi:", data);
        setCompany(data);

        // Ürünleri ve ödemeleri paralel olarak çek
        const [allProducts, allPayments] = await Promise.all([
          productService.getAll(),
          paymentService.getAll(),
        ]);

        console.log("Tüm ürünler:", allProducts.length);
        console.log("Tüm ödemeler:", allPayments.length);

        // Ürünleri filtrele (hem firma adına hem ID'sine göre)
        const filteredProducts = allProducts.filter((p) => {
          const hasSupplier =
            Array.isArray(p.supplier) && p.supplier.length > 0;
          if (!hasSupplier) return false;
          const matchesName = p.supplier!.includes(data.name);
          const matchesId = p.supplier!.includes(id);
          console.log(
            `Ürün: ${p.name}, Supplier: ${p.supplier}, Firma: ${
              data.name
            }, Eşleşme: ${matchesName || matchesId}`
          );
          return matchesName || matchesId;
        });
        console.log("Filtrelenmiş ürünler:", filteredProducts.length);
        setProducts(filteredProducts);

        // Ödemeleri filtrele (hem firma adına hem ID'sine göre)
        const filteredPayments = allPayments.filter((p) => {
          const matchesName = p.company === data.name;
          const matchesId = p.company === id;
          console.log(
            `Ödeme: ${p.amount}, Company: ${p.company}, Firma: ${
              data.name
            }, Eşleşme: ${matchesName || matchesId}`
          );
          return matchesName || matchesId;
        });
        console.log("Filtrelenmiş ödemeler:", filteredPayments.length);
        setPayments(filteredPayments);
      } catch (error) {
        console.error("Veri yüklenirken hata:", error);
        // Hata durumunda boş array'ler set et
        setProducts([]);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Ödemeleri otomatik yenile (her 5 saniyede bir)
  useEffect(() => {
    if (!company) return;

    const interval = setInterval(() => {
      refreshPayments();
    }, 5000);

    return () => clearInterval(interval);
  }, [company, refreshPayments]);

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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
          </div>
        </div>
      </div>
    );
  }
  if (!company) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center text-red-500 py-8">
              Firma bulunamadı.
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-2">
      <div className="bg-white dark:bg-gray-900 shadow-2xl rounded-2xl w-full max-w-[96vw] min-h-[60vh] max-h-[92vh] flex flex-col p-0 relative overflow-hidden">
        <button
          onClick={() => router.back()}
          className="absolute top-4 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl z-10"
        >
          ×
        </button>
        {/* Üst başlık ve özet */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-8 pt-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 min-w-0">
            <span className="inline-block w-6 h-6 rounded-full border-2 border-gray-300 bg-primary-600"></span>
            <div className="min-w-0 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  {company.name}
                </span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-300 truncate">
                {company.phone || "-"} • {company.address || "-"}
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-8 flex-shrink-0">
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Toplam Alış
              </span>
              <span className="font-bold text-lg text-red-500">
                {totalProductValue.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Toplam Ödeme
              </span>
              <span
                className="font-bold text-lg text-green-500 cursor-pointer underline decoration-dotted hover:decoration-solid"
                onClick={() => setShowOdemeDetail(true)}
                title="Ödeme detaylarını gör"
              >
                {totalCompletedPayments.toFixed(2)} ₺
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Kalan Borç
              </span>
              <span
                className="font-bold text-lg text-orange-500 cursor-pointer underline decoration-dotted hover:decoration-solid"
                onClick={() => setShowBorcDetail(true)}
                title="Kalan borç detaylarını gör"
              >
                {balance.toFixed(2)} ₺
              </span>
            </div>
          </div>
        </div>
        {/* Ana içerik yatay iki blok */}
        <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-8 px-4 md:px-8 pb-8 pt-4 overflow-hidden">
          {/* Sol blok: Ürünler */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-gray-700 pr-0 md:pr-8">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                Alınan Ürünler
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={productStartDate}
                  onChange={(e) => setProductStartDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="date"
                  value={productEndDate}
                  onChange={(e) => setProductEndDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                />
                <button
                  onClick={() => {
                    setProductStartDate("");
                    setProductEndDate("");
                  }}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs"
                >
                  Temizle
                </button>
                <select
                  value={productSort}
                  onChange={(e) =>
                    setProductSort(
                      e.target.value as
                        | "date_desc"
                        | "date_asc"
                        | "amount_desc"
                        | "amount_asc"
                    )
                  }
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="date_desc">Tarih (Yeni &gt; Eski)</option>
                  <option value="date_asc">Tarih (Eski &gt; Yeni)</option>
                  <option value="amount_desc">Tutar (Büyük &gt; Küçük)</option>
                  <option value="amount_asc">Tutar (Küçük &gt; Büyük)</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                      Ürün
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                      Adet
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                      Birim Fiyat
                    </th>
                    <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                      Toplam
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center text-gray-400 py-8 text-xs"
                      >
                        Ürün yok
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr
                        key={p.id || p._id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(p);
                          setShowProductModal(true);
                        }}
                      >
                        <td className="font-semibold text-gray-900 dark:text-white max-w-[180px] truncate px-2 py-1">
                          {p.name}
                        </td>
                        <td className="text-gray-500 dark:text-gray-300 px-2 py-1">
                          {p.stock || 0} adet
                        </td>
                        <td className="text-gray-500 dark:text-gray-300 px-2 py-1">
                          {p.purchasePrice || p.price} ₺
                        </td>
                        <td className="font-semibold text-gray-900 dark:text-white px-2 py-1">
                          {(
                            (p.purchasePrice || p.price || 0) * (p.stock || 0)
                          ).toFixed(2)}{" "}
                          ₺
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Sağ blok: Ödemeler */}
          <div className="flex-1 flex flex-col min-w-0 pl-0 md:pl-8 gap-8">
            {/* Yapılan Ödemeler */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-lg font-semibold text-success-700 dark:text-success-300">
                  Yapılan Ödemeler
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={completedStartDate}
                    onChange={(e) => setCompletedStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={completedEndDate}
                    onChange={(e) => setCompletedEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                  <button
                    onClick={() => {
                      setCompletedStartDate("");
                      setCompletedEndDate("");
                    }}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs"
                  >
                    Temizle
                  </button>
                  <select
                    value={completedSort}
                    onChange={(e) =>
                      setCompletedSort(
                        e.target.value as
                          | "date_desc"
                          | "date_asc"
                          | "amount_desc"
                          | "amount_asc"
                      )
                    }
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="date_desc">Tarih (Yeni &gt; Eski)</option>
                    <option value="date_asc">Tarih (Eski &gt; Yeni)</option>
                    <option value="amount_desc">
                      Tutar (Büyük &gt; Küçük)
                    </option>
                    <option value="amount_asc">Tutar (Küçük &gt; Büyük)</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        Tutar
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        Tip
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        Tarih
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-gray-400 py-8 text-xs"
                        >
                          Ödeme yok
                        </td>
                      </tr>
                    ) : (
                      completedPayments.map((pay) => (
                        <tr
                          key={pay.id || pay._id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="font-semibold text-success-600 px-2 py-1">
                            {pay.amount} ₺
                          </td>
                          <td className="text-gray-500 dark:text-gray-300 px-2 py-1">
                            {pay.paymentType || "-"}
                          </td>
                          <td className="text-xs text-gray-400 px-2 py-1">
                            {pay.date
                              ? new Date(pay.date).toLocaleDateString("tr-TR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Bekleyen Ödemeler */}
            <div>
              <div className="flex items-center justify-between mb-2 mt-6">
                <div className="text-lg font-semibold text-warning-700 dark:text-warning-300">
                  Bekleyen Ödemeler
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={pendingStartDate}
                    onChange={(e) => setPendingStartDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="date"
                    value={pendingEndDate}
                    onChange={(e) => setPendingEndDate(e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs"
                  />
                  <button
                    onClick={() => {
                      setPendingStartDate("");
                      setPendingEndDate("");
                    }}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs"
                  >
                    Temizle
                  </button>
                  <select
                    value={pendingSort}
                    onChange={(e) =>
                      setPendingSort(
                        e.target.value as
                          | "date_desc"
                          | "date_asc"
                          | "amount_desc"
                          | "amount_asc"
                      )
                    }
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="date_desc">Tarih (Yeni &gt; Eski)</option>
                    <option value="date_asc">Tarih (Eski &gt; Yeni)</option>
                    <option value="amount_desc">
                      Tutar (Büyük &gt; Küçük)
                    </option>
                    <option value="amount_asc">Tutar (Küçük &gt; Büyük)</option>
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto rounded-lg bg-gray-50 dark:bg-gray-800 p-2">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        Tutar
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        Tip
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        Tarih
                      </th>
                      <th className="text-left font-medium text-gray-500 dark:text-gray-400 py-2 px-2">
                        İşlem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPayments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center text-gray-400 py-8 text-xs"
                        >
                          Bekleyen ödeme yok
                        </td>
                      </tr>
                    ) : (
                      pendingPayments.map((pay) => (
                        <tr
                          key={pay.id || pay._id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="font-semibold text-warning-600 px-2 py-1">
                            {pay.amount} ₺
                          </td>
                          <td className="text-gray-500 dark:text-gray-300 px-2 py-1">
                            {pay.paymentType || "-"}
                          </td>
                          <td className="text-xs text-gray-400 px-2 py-1">
                            {pay.date
                              ? new Date(pay.date).toLocaleDateString("tr-TR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>
                          <td className="px-2 py-1">
                            <button
                              onClick={() => {
                                setSelectedPayment(pay);
                                setPaymentModalForm({
                                  amount: pay.amount?.toString() || "",
                                  description: "",
                                  paymentType: "nakit",
                                });
                                setShowPaymentModal(true);
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                            >
                              Öde
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                  <span className="text-gray-600 dark:text-gray-300">
                    Fiyat:
                  </span>
                  <span className="font-semibold">
                    ₺{selectedProduct.price?.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    Stok:
                  </span>
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
                    <span className="text-gray-600 dark:text-gray-300">
                      OEM:
                    </span>
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
        {/* Ödeme Detay Modalı */}
        {showOdemeDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowOdemeDetail(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Kapat
              </button>
              <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Ödeme Detayı
              </h4>
              {completedPayments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">Ödeme yok.</p>
              ) : (
                <ul>
                  {completedPayments.map((pay) => (
                    <li
                      key={pay.id || pay._id}
                      className="py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {pay.amount.toFixed(2)} ₺
                        </span>
                        <span className="text-xs text-gray-500">
                          {pay.date
                            ? new Date(pay.date).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {pay.paymentType || "-"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Kalan Borç Detay Modalı */}
        {showBorcDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowBorcDetail(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Kapat
              </button>
              <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                Kalan Borç Detayı
              </h4>
              {pendingPayments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  Kalan borç yok.
                </p>
              ) : (
                <ul>
                  {pendingPayments.map((pay) => (
                    <li
                      key={pay.id || pay._id}
                      className="py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <div className="flex justify-between">
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {pay.amount.toFixed(2)} ₺
                        </span>
                        <span className="text-xs text-gray-500">
                          {pay.date
                            ? new Date(pay.date).toLocaleDateString("tr-TR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })
                            : "-"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {pay.paymentType || "-"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Ödeme Modalı */}
        {showPaymentModal && selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ödeme Yap
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Bekleyen Tutar:</strong> {selectedPayment.amount} ₺
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Tarih:</strong>{" "}
                  {selectedPayment.date
                    ? new Date(selectedPayment.date).toLocaleDateString("tr-TR")
                    : "-"}
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (
                    !paymentModalForm.amount ||
                    parseFloat(paymentModalForm.amount) <= 0
                  )
                    return;

                  setPaymentModalLoading(true);
                  try {
                    // Sadece bekleyen ödemeyi güncelle (yeni ödeme oluşturma)
                    await paymentService.update(
                      selectedPayment.id || selectedPayment._id || "",
                      {
                        isPaid: true,
                        paymentType: paymentModalForm.paymentType,
                        description: paymentModalForm.description,
                        amount: parseFloat(paymentModalForm.amount),
                      }
                    );

                    // Ödemeleri yeniden yükle
                    await refreshPayments();

                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                    setPaymentModalForm({
                      amount: "",
                      description: "",
                      paymentType: "nakit",
                    });
                  } catch (error) {
                    console.error("Ödeme yapılırken hata:", error);
                  } finally {
                    setPaymentModalLoading(false);
                  }
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ödenecek Tutar
                    </label>
                    <input
                      type="number"
                      value={paymentModalForm.amount}
                      onChange={(e) =>
                        setPaymentModalForm({
                          ...paymentModalForm,
                          amount: e.target.value,
                        })
                      }
                      placeholder="Tutar"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ödeme Tipi
                    </label>
                    <select
                      value={paymentModalForm.paymentType}
                      onChange={(e) =>
                        setPaymentModalForm({
                          ...paymentModalForm,
                          paymentType: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="nakit">Nakit</option>
                      <option value="havale">Havale/EFT</option>
                      <option value="kredi kartı">Kredi Kartı</option>
                      <option value="diğer">Diğer</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Açıklama (İsteğe bağlı)
                    </label>
                    <textarea
                      value={paymentModalForm.description}
                      onChange={(e) =>
                        setPaymentModalForm({
                          ...paymentModalForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Ödeme açıklaması..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={paymentModalLoading}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {paymentModalLoading ? "Ödeniyor..." : "Ödemeyi Tamamla"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
