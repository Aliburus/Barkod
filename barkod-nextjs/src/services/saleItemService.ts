export const saleItemService = {
  // Müşteriye ait tüm satış kalemlerini getir
  getByCustomerId: async (customerId: string) => {
    try {
      const response = await fetch(`/api/sale-items?customerId=${customerId}`);
      if (!response.ok) {
        throw new Error("Sale items getirilemedi");
      }
      return await response.json();
    } catch (error) {
      console.error("Sale items getirme hatası:", error);
      throw error;
    }
  },

  // Satışa ait tüm kalemleri getir
  getBySaleId: async (saleId: string) => {
    try {
      const response = await fetch(`/api/sale-items?saleId=${saleId}`);
      if (!response.ok) {
        throw new Error("Sale items getirilemedi");
      }
      return await response.json();
    } catch (error) {
      console.error("Sale items getirme hatası:", error);
      throw error;
    }
  },

  // Ürüne ait tüm satış kalemlerini getir
  getByProductId: async (productId: string) => {
    try {
      const response = await fetch(`/api/sale-items?productId=${productId}`);
      if (!response.ok) {
        throw new Error("Sale items getirilemedi");
      }
      return await response.json();
    } catch (error) {
      console.error("Sale items getirme hatası:", error);
      throw error;
    }
  },

  // Yeni satış kalemleri oluştur
  create: async (data: {
    saleId: string;
    customerId: string;
    subCustomerId?: string;
    items: Array<{
      productId: string;
      barcode: string;
      productName: string;
      quantity: number;
      originalPrice: number;
      customPrice?: number;
      finalPrice: number;
      totalAmount: number;
    }>;
  }) => {
    try {
      const response = await fetch("/api/sale-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Sale items oluşturulamadı");
      }

      return await response.json();
    } catch (error) {
      console.error("Sale items oluşturma hatası:", error);
      throw error;
    }
  },

  // Müşterinin özel fiyat geçmişini getir
  getCustomerPriceHistory: async (customerId: string, productId?: string) => {
    try {
      let url = `/api/sale-items?customerId=${customerId}`;
      if (productId) {
        url += `&productId=${productId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Fiyat geçmişi getirilemedi");
      }

      const saleItems = await response.json();

      // Ürün bazında grupla ve son fiyatları getir
      const priceHistory = saleItems.reduce(
        (acc: Record<string, any>, item: any) => {
          const key = item.productId._id || item.productId;
          if (!acc[key]) {
            acc[key] = {
              productId: key,
              productName: item.productName,
              barcode: item.barcode,
              lastCustomPrice: item.customPrice,
              lastFinalPrice: item.finalPrice,
              lastSaleDate: item.createdAt,
              totalSales: 0,
              totalQuantity: 0,
            };
          }

          acc[key].totalSales += item.totalAmount;
          acc[key].totalQuantity += item.quantity;

          return acc;
        },
        {}
      );

      return Object.values(priceHistory);
    } catch (error) {
      console.error("Fiyat geçmişi getirme hatası:", error);
      throw error;
    }
  },
};
