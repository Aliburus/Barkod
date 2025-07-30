"use client";
import React, { useState, useEffect } from "react";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { Product, Customer, SubCustomer } from "../../types";
import { Trash2, Plus, Minus, ShoppingCart, Edit3 } from "lucide-react";
import { productService } from "../../services/productService";
import { customerService } from "../../services/customerService";
import { subCustomerService } from "../../services/subCustomerService";
import { saleItemService } from "../../services/saleItemService";
import { vendorService } from "../../services/vendorService";

interface CartItem {
  product: Product;
  quantity: number;
  customPrice?: number; // Düzenlenebilir fiyat
  uniqueId: string; // Benzersiz ID
}

// Düzenlenebilir fiyat bileşeni
const EditablePrice: React.FC<{
  value: number;
  onSave: (newPrice: number) => Promise<void>;
}> = ({ value, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  const handleSave = async () => {
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      await onSave(newPrice);
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value.toString());
    }
  };

  const handleBlur = async () => {
    await handleSave();
  };

  if (isEditing) {
    return (
      <input
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyPress={handleKeyPress}
        className="w-20 px-2 py-1 text-right border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        autoFocus
      />
    );
  }

  return (
    <div className="flex items-center justify-end gap-1 group">
      <span className="font-medium">₺{value.toLocaleString()}</span>
      <button
        onClick={() => {
          setIsEditing(true);
          setEditValue(value.toString());
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
      >
        <Edit3 className="w-3 h-3" />
      </button>
    </div>
  );
};

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
  const [subCustomers, setSubCustomers] = useState<SubCustomer[]>([]);
  const [selectedSubCustomer, setSelectedSubCustomer] = useState<string>("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddSubCustomer, setShowAddSubCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [newSubCustomer, setNewSubCustomer] = useState({
    name: "",
    phone: "",
  });
  const [vendors, setVendors] = useState<
    { _id?: string; name: string; phone?: string; email?: string }[]
  >([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [isPurchaseMode, setIsPurchaseMode] = useState(false);

  // Sepetten localStorage'dan yükle ve müşterileri yükle
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Eski verilerde uniqueId yoksa, yeni uniqueId ekle
        const updatedCart = parsedCart.map((item: CartItem, index: number) => ({
          ...item,
          uniqueId:
            item.uniqueId ||
            `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        }));
        setCartItems(updatedCart);
      } catch (error) {
        console.error("Sepet verilerini yüklerken hata:", error);
        setCartItems([]);
      }
    }
    customerService
      .getAll()
      .then((data) => {
        if (data && data.customers) {
          setCustomers(data.customers);
        } else {
          setCustomers([]);
        }
      })
      .catch((error) => {
        console.error("Müşteriler yüklenirken hata:", error);
        setCustomers([]);
      });

    // Vendor'ları yükle
    vendorService
      .getAll()
      .then((data) => {
        if (data && data.vendors) {
          setVendors(data.vendors);
        } else {
          setVendors([]);
        }
      })
      .catch((error) => {
        console.error("Tedarikçiler yüklenirken hata:", error);
        setVendors([]);
      });

    setLoading(false);
  }, []);

  // Sepeti localStorage'a kaydet
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("cart", JSON.stringify(cartItems));
    }
  }, [cartItems, loading]);

  // Müşteri seçildiğinde SubCustomer'ları yükle
  useEffect(() => {
    if (selectedCustomer) {
      subCustomerService
        .getByCustomerId(selectedCustomer)
        .then((data) => {
          setSubCustomers(data);
          setSelectedSubCustomer(""); // Müşteri değiştiğinde SubCustomer seçimini sıfırla
        })
        .catch((error) => {
          console.error("SubCustomer'lar yüklenirken hata:", error);
          setSubCustomers([]);
        });
    } else {
      setSubCustomers([]);
      setSelectedSubCustomer("");
    }
  }, [selectedCustomer]);

  // Tedarikçi seçildiğinde alış moduna geç
  useEffect(() => {
    if (selectedVendor) {
      setIsPurchaseMode(true);
      setSelectedCustomer(""); // Müşteri seçimini temizle
      setSelectedSubCustomer(""); // Alt müşteri seçimini temizle
    } else {
      setIsPurchaseMode(false);
    }
  }, [selectedVendor]);

  const updateQuantity = (uniqueId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(uniqueId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.uniqueId === uniqueId) {
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

  const removeFromCart = (uniqueId: string) => {
    setCartItems((prev) => prev.filter((item) => item.uniqueId !== uniqueId));
  };

  const clearCart = () => {
    setCartItems([]);
    // Eski verileri temizlemek için localStorage'ı da temizle
    if (typeof window !== "undefined") {
      localStorage.removeItem("cartItems");
      sessionStorage.removeItem("cartItems");
    }
  };

  const updateItemPrice = async (uniqueId: string, newPrice: number) => {
    // Sepet state'ini güncelle
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.uniqueId === uniqueId) {
          return { ...item, customPrice: newPrice };
        }
        return item;
      })
    );

    // Alış modunda ise ürünün veritabanındaki purchasePrice'ını da güncelle
    if (isPurchaseMode) {
      const cartItem = cartItems.find((item) => item.uniqueId === uniqueId);
      if (cartItem) {
        try {
          const response = await fetch("/api/products", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: cartItem.product.id || cartItem.product._id,
              purchasePrice: newPrice,
            }),
          });

          if (!response.ok) {
            console.error("Ürün alış fiyatı güncellenirken hata oluştu");
            setNotification({
              message: "Ürün alış fiyatı güncellenirken hata oluştu",
              type: "error",
              show: true,
            });
          } else {
            // Başarılı güncelleme sonrası ürün bilgisini de güncelle
            setCartItems((prev) =>
              prev.map((item) => {
                if (item.uniqueId === uniqueId) {
                  return {
                    ...item,
                    product: {
                      ...item.product,
                      purchasePrice: newPrice,
                    },
                  };
                }
                return item;
              })
            );
          }
        } catch (error) {
          console.error("Ürün alış fiyatı güncelleme hatası:", error);
          setNotification({
            message: "Ürün alış fiyatı güncellenirken hata oluştu",
            type: "error",
            show: true,
          });
        }
      }
    }
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
          // Her seferinde yeni bir satır ekle (birleştirme yapma)
          if (product.stock < 1) {
            setNotification({
              message: `Ürün stokta yok: ${product.name}`,
              type: "warning",
              show: true,
            });
            return prev; // Sepeti değiştirme
          }

          // Benzersiz ID oluştur (timestamp + random)
          const uniqueId = `${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;

          return [
            ...prev,
            {
              product,
              quantity: 1,
              uniqueId: uniqueId, // Benzersiz ID ekle
            },
          ];
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

  const handleAddSubCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCustomer.name.trim() || !selectedCustomer) return;
    const created = await subCustomerService.create({
      ...newSubCustomer,
      customerId: selectedCustomer,
      status: "active",
    });
    setSubCustomers((prev) => [...prev, created]);
    setSelectedSubCustomer(created.id);
    setShowAddSubCustomer(false);
    setNewSubCustomer({
      name: "",
      phone: "",
    });
  };

  const totalAmount = cartItems.reduce(
    (sum, item) =>
      sum + (item.customPrice || item.product.price) * item.quantity,
    0
  );

  const totalPurchaseAmount = cartItems.reduce(
    (sum, item) =>
      sum +
      (item.customPrice || item.product.purchasePrice || item.product.price) *
        item.quantity,
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
        <Header activeTab="sepet" onAddProduct={() => {}} />
        <Navigation activeTab="sepet" onTabChange={() => {}} />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Header activeTab="sepet" onAddProduct={() => {}} />
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
                          {isPurchaseMode ? "Alış Fiyatı" : "Fiyat"}
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          İşlem
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item, index) => (
                        <tr
                          key={
                            item.uniqueId || `${item.product.barcode}-${index}`
                          }
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
                                    item.uniqueId,
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
                                    item.uniqueId,
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
                            <EditablePrice
                              value={
                                isPurchaseMode
                                  ? item.customPrice ||
                                    item.product.purchasePrice ||
                                    item.product.price
                                  : item.customPrice || item.product.price
                              }
                              onSave={async (newPrice) =>
                                await updateItemPrice(item.uniqueId, newPrice)
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeFromCart(item.uniqueId)}
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
                    {isPurchaseMode ? "Toplam Alış Tutarı:" : "Toplam Tutar:"}
                  </span>
                  <span className="font-bold text-xl">
                    ₺
                    {(isPurchaseMode
                      ? totalPurchaseAmount
                      : totalAmount
                    ).toLocaleString()}
                  </span>
                </div>
              </div>

              {cartItems.length > 0 && (
                <>
                  {/* Tedarikçi Seçimi */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tedarikçi (Alış için)
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedVendor}
                        onChange={(e) => setSelectedVendor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Tedarikçi seçin (Alış modu)</option>
                        {vendors &&
                          Array.isArray(vendors) &&
                          vendors.map((v) => (
                            <option key={v._id} value={v._id}>
                              {v.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Müşteri Seçimi - Sadece alış modu değilse göster */}
                  {!isPurchaseMode && (
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
                          {customers &&
                            Array.isArray(customers) &&
                            customers.map((c) => (
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
                  )}

                  {/* SubCustomer Seçimi - Sadece satış modunda göster */}
                  {!isPurchaseMode && selectedCustomer && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Müşterinin Müşterisi
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={selectedSubCustomer}
                          onChange={(e) =>
                            setSelectedSubCustomer(e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Müşterinin müşterisini seçin</option>
                          {subCustomers &&
                            Array.isArray(subCustomers) &&
                            subCustomers.map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                {sc.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowAddSubCustomer(true)}
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                        >
                          + Yeni
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ödeme Yöntemi ve Borçlu Satış - Sadece satış modunda göster */}
                  {!isPurchaseMode && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Ödeme Yöntemi
                        </label>
                        <select
                          value={selectedPaymentType}
                          onChange={(e) =>
                            setSelectedPaymentType(e.target.value)
                          }
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
                    </>
                  )}

                  <button
                    onClick={async () => {
                      if (isPurchaseMode) {
                        // ALIŞ MODU - Tedarikçiden alış
                        if (!selectedVendor) {
                          setNotification({
                            message: "Tedarikçi seçmelisiniz!",
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
                          // Purchase Order oluştur
                          const purchaseOrderData = {
                            vendorId: selectedVendor,
                            orderNumber: `PO-${Date.now()}-${Math.random()
                              .toString(36)
                              .substr(2, 9)}`,
                            orderDate: new Date().toISOString(),
                            items: cartItems.map((item) => ({
                              productId: item.product.id || item.product._id,
                              productName: item.product.name,
                              barcode: item.product.barcode,
                              quantity: item.quantity,
                              unitPrice:
                                item.customPrice ||
                                item.product.purchasePrice ||
                                item.product.price,
                              totalPrice:
                                (item.customPrice ||
                                  item.product.purchasePrice ||
                                  item.product.price) * item.quantity,
                            })),
                            totalAmount: cartItems.reduce(
                              (sum, item) =>
                                sum +
                                (item.customPrice ||
                                  item.product.purchasePrice ||
                                  item.product.price) *
                                  item.quantity,
                              0
                            ),
                            status: "received",
                            notes: `Sepet üzerinden alış - ${selectedVendor}`,
                          };

                          const purchaseResponse = await fetch(
                            "/api/purchase-orders",
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(purchaseOrderData),
                            }
                          );

                          if (purchaseResponse.ok) {
                            const purchaseResult =
                              await purchaseResponse.json();

                            // Stok sayısını güncelle
                            for (const item of cartItems) {
                              const newStock =
                                (item.product.stock || 0) + item.quantity;
                              await fetch("/api/products", {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  id: item.product.id || item.product._id,
                                  stock: newStock,
                                }),
                              });
                            }

                            // MyDebt oluştur
                            const selectedVendorData = vendors.find(
                              (v) => v._id === selectedVendor
                            );
                            const myDebtData = {
                              vendorId: selectedVendor,
                              vendorName:
                                selectedVendorData?.name ||
                                "Bilinmeyen Tedarikçi",
                              amount: cartItems.reduce(
                                (sum, item) =>
                                  sum +
                                  (item.customPrice ||
                                    item.product.purchasePrice ||
                                    item.product.price) *
                                    item.quantity,
                                0
                              ),
                              description: "",
                              purchaseOrderId: purchaseResult._id,
                              notes: `Otomatik oluşturulan borç - Sepet alışı`,
                            };

                            const myDebtResponse = await fetch(
                              "/api/my-debts",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify(myDebtData),
                              }
                            );

                            if (!myDebtResponse.ok) {
                              console.error("My debt creation failed");
                            }

                            // Başarılı alış sonrası sepeti temizle
                            clearCart();
                            setSelectedVendor("");
                            setIsPurchaseMode(false);
                            setNotification({
                              message: "Alış başarıyla tamamlandı!",
                              type: "success",
                              show: true,
                            });
                          } else {
                            const errorData = await purchaseResponse.json();
                            setNotification({
                              message: `Alış işlemi sırasında hata: ${errorData.error}`,
                              type: "error",
                              show: true,
                            });
                          }
                        } catch (error) {
                          console.error("Alış işlemi hatası:", error);
                          setNotification({
                            message: "Alış işlemi sırasında hata oluştu!",
                            type: "error",
                            show: true,
                          });
                        }
                      } else {
                        // SATIŞ MODU - Müşteriye satış
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
                              price: item.customPrice || item.product.price, // Özel fiyat kullan
                              productName: item.product.name,
                            })),
                            customerId: selectedCustomer,
                            subCustomerId: selectedSubCustomer || undefined,
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
                            const saleResult = await response.json();

                            // Sale items oluştur
                            const saleItemsData = {
                              saleId: saleResult._id,
                              customerId: selectedCustomer,
                              subCustomerId: selectedSubCustomer || undefined,
                              items: cartItems.map((item) => ({
                                productId: (item.product.id ||
                                  item.product._id) as string,
                                barcode: item.product.barcode,
                                productName: item.product.name,
                                quantity: item.quantity,
                                originalPrice: item.product.price,
                                customPrice: item.customPrice,
                                finalPrice:
                                  item.customPrice || item.product.price,
                                totalAmount:
                                  (item.customPrice || item.product.price) *
                                  item.quantity,
                              })),
                            };

                            await saleItemService.create(saleItemsData);

                            // Başarılı satış sonrası sepeti temizle
                            clearCart();
                            setSelectedCustomer("");
                            setSelectedSubCustomer("");
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
                      }
                    }}
                    className={`w-full py-3 px-4 rounded-lg transition-colors font-semibold ${
                      isPurchaseMode
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isPurchaseMode ? "Alışı Tamamla" : "Satışı Tamamla"}
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

      {/* SubCustomer Ekleme Modal */}
      {showAddSubCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Yeni Alt Müşteri Ekle
              </h2>
              <button
                onClick={() => setShowAddSubCustomer(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubCustomer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alt Müşteri Adı
                </label>
                <input
                  type="text"
                  value={newSubCustomer.name}
                  onChange={(e) =>
                    setNewSubCustomer({
                      ...newSubCustomer,
                      name: e.target.value,
                    })
                  }
                  placeholder="Alt müşteri adını girin..."
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
                  value={newSubCustomer.phone}
                  onChange={(e) =>
                    setNewSubCustomer({
                      ...newSubCustomer,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Telefon numarası..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ekle
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSubCustomer(false)}
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
