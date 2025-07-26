"use client";
import React, { useState, useEffect } from "react";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { Product, Customer } from "../../types";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import { productService } from "../../services/productService";
import { customerService } from "../../services/customerService";

interface CartItem {
  product: Product;
  quantity: number;
}

const SepetPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPaymentType, setSelectedPaymentType] = useState("nakit");
  const [isDebt, setIsDebt] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
    show: boolean;
  }>({ message: "", type: "success", show: false });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });

  // Sepetten localStorage'dan yükle ve müşterileri yükle
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
    customerService.getAll().then(setCustomers);
    setLoading(false);
  }, []);

  // Sepeti localStorage'a kaydet
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems, loading]);

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (
          item.product.id === productId ||
          item.product.barcode === productId
        ) {
          // Stok kontrolü
          if (newQuantity > item.product.stock) {
            setNotification({
              message: `Yeterli stok yok: ${item.product.name} (Mevcut: ${item.product.stock})`,
              type: "warning",
              show: true,
            });
            return item; // Miktarı değiştirme
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) =>
      prev.filter(
        (item) =>
          item.product.id !== productId && item.product.barcode !== productId
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const addToCart = async (barcode: string) => {
    try {
      const product = await productService.getProductByBarcode(barcode);
      if (product) {
        // Stok kontrolü
        if (product.stock <= 0) {
          setNotification({
            message: `Ürün stokta yok: ${product.name}`,
            type: "warning",
            show: true,
          });
          return false;
        }

        setCartItems((prev) => {
          const existingItem = prev.find(
            (item) =>
              item.product.id === product.id ||
              item.product.barcode === product.barcode
          );

          if (existingItem) {
            // Mevcut ürünün yeni miktarı
            const newQuantity = existingItem.quantity + 1;

            // Stok kontrolü
            if (newQuantity > product.stock) {
              setNotification({
                message: `Yeterli stok yok: ${product.name} (Mevcut: ${product.stock})`,
                type: "warning",
                show: true,
              });
              return prev; // Sepeti değiştirme
            }

            return prev.map((item) =>
              item.product.id === product.id ||
              item.product.barcode === product.barcode
                ? { ...item, quantity: newQuantity }
                : item
            );
          } else {
            // Yeni ürün ekleme
            if (product.stock < 1) {
              setNotification({
                message: `Ürün stokta yok: ${product.name}`,
                type: "warning",
                show: true,
              });
              return prev; // Sepeti değiştirme
            }

            return [...prev, { product, quantity: 1 }];
          }
        });
        return true; // Başarılı
      }
      return false; // Ürün bulunamadı
    } catch (error) {
      console.error("Ürün sepete eklenirken hata:", error);
      return false;
    }
  };

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Sayfa yenilenmesini engelle
    if (barcodeInput.trim()) {
      const success = await addToCart(barcodeInput.trim());
      if (success) {
        setBarcodeInput("");
        setShowBarcodeModal(false);
        setNotification({
          message: "Ürün sepete eklendi!",
          type: "success",
          show: true,
        });
      } else {
        setNotification({
          message: "Ürün bulunamadı!",
          type: "error",
          show: true,
        });
      }
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name.trim()) return;
    const created = await customerService.create(newCustomer);
    setCustomers((prev) => [...prev, created]);
    setSelectedCustomer(created.id);
    setShowAddCustomer(false);
    setNewCustomer({ name: "", phone: "", address: "" });
  };

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const filteredItems = cartItems.filter(
    (item) =>
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.barcode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <Header activeTab="sepet" lowStockCount={0} onAddProduct={() => {}} />
        <Navigation activeTab="sepet" onTabChange={() => {}} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header activeTab="sepet" lowStockCount={0} onAddProduct={() => {}} />
      <Navigation activeTab="sepet" onTabChange={() => {}} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Alışveriş Sepeti
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {totalItems} ürün
            </span>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Sepeti Temizle
              </button>
            )}
          </div>
        </div>

        {/* Arama */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Sepette ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sepet Listesi */}
          <div className="lg:col-span-2">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Sepetiniz boş
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Ürün eklemek için barkod tarayabilir veya ürünler sayfasından
                  seçebilirsiniz.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Ürün
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Adet
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Fiyat
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Toplam
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr
                          key={item.product.id || item.product.barcode}
                          className="border-b border-gray-100 dark:border-gray-700"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {item.product.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {item.product.barcode}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id || item.product.barcode,
                                    item.quantity - 1
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id || item.product.barcode,
                                    item.quantity + 1
                                  )
                                }
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-medium">
                              ₺{item.product.price.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-lg">
                              ₺
                              {(
                                item.product.price * item.quantity
                              ).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                removeFromCart(
                                  item.product.id || item.product.barcode
                                )
                              }
                              className="text-red-600 hover:text-red-800 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Özet */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sipariş Özeti
              </h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Ürün Sayısı:
                  </span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Toplam Tutar:
                  </span>
                  <span className="font-bold text-xl">
                    ₺{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {cartItems.length > 0 && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Müşteri
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Müşteri seçin</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddCustomer(true)}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                      >
                        + Yeni
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Ödeme Yöntemi
                    </label>
                    <select
                      value={selectedPaymentType}
                      onChange={(e) => setSelectedPaymentType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="nakit">Nakit</option>
                      <option value="kredi kartı">Kredi Kartı</option>
                      <option value="havale">Havale/EFT</option>
                      <option value="diğer">Diğer</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={isDebt}
                        onChange={(e) => setIsDebt(e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Borçlu Satış
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={async () => {
                      if (!selectedCustomer) {
                        setNotification({
                          message: "Müşteri seçmelisiniz!",
                          type: "warning",
                          show: true,
                        });
                        return;
                      }

                      if (cartItems.length === 0) {
                        setNotification({
                          message: "Sepette ürün bulunmuyor!",
                          type: "warning",
                          show: true,
                        });
                        return;
                      }

                      try {
                        // Satış işlemi için API çağrısı
                        const saleData = {
                          items: cartItems.map((item) => ({
                            barcode: item.product.barcode,
                            quantity: item.quantity,
                            price: item.product.price,
                            productName: item.product.name,
                          })),
                          customerId: selectedCustomer,
                          paymentType: selectedPaymentType,
                          totalAmount: totalAmount,
                          isDebt: isDebt,
                        };

                        const response = await fetch("/api/sales", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify(saleData),
                        });

                        if (response.ok) {
                          // Başarılı satış sonrası sepeti temizle
                          clearCart();
                          setSelectedCustomer("");
                          setSelectedPaymentType("nakit");
                          setIsDebt(false);
                          setNotification({
                            message: "Satış başarıyla tamamlandı!",
                            type: "success",
                            show: true,
                          });
                        } else {
                          const errorData = await response.json();
                          setNotification({
                            message: `Satış işlemi sırasında hata: ${errorData.error}`,
                            type: "error",
                            show: true,
                          });
                        }
                      } catch (error) {
                        console.error("Satış işlemi hatası:", error);
                        setNotification({
                          message: "Satış işlemi sırasında hata oluştu!",
                          type: "error",
                          show: true,
                        });
                      }
                    }}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Satışı Tamamla
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg text-white ${
              notification.type === "success"
                ? "bg-green-500"
                : notification.type === "error"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button
                onClick={() =>
                  setNotification({ ...notification, show: false })
                }
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barkod Arama Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Barkod Ara
              </h2>
              <button
                onClick={() => setShowBarcodeModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleBarcodeSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Barkod
                </label>
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Barkod numarasını girin..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sepete Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowBarcodeModal(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Müşteri Ekleme Modal */}
      {showAddCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Yeni Müşteri Ekle
              </h2>
              <button
                onClick={() => setShowAddCustomer(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Müşteri Adı
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, name: e.target.value })
                  }
                  placeholder="Müşteri adını girin..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefon
                </label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="Telefon numarası..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Adres
                </label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, address: e.target.value })
                  }
                  placeholder="Adres..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCustomer(false)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SepetPage;
