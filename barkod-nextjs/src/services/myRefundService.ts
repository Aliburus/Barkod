import { MyRefund } from "../types";

export const myRefundService = {
  // Tedarikçi iadesi oluştur
  async createMyRefund(refundData: {
    vendorId: string;
    vendorName: string;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    refundAmount: number;
    reason?: string;
    debtId?: string;
  }): Promise<MyRefund> {
    const response = await fetch("/api/my-refunds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(refundData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Tedarikçi iadesi oluşturulamadı");
    }

    return response.json();
  },

  // Tedarikçi için iadeleri getir
  async getMyRefundsByVendorId(vendorId: string): Promise<MyRefund[]> {
    const response = await fetch(`/api/my-refunds?vendorId=${vendorId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Tedarikçi iadeleri getirilemedi");
    }

    return response.json();
  },

  // Tüm tedarikçi iadelerini getir
  async getAllMyRefunds(): Promise<MyRefund[]> {
    const response = await fetch("/api/my-refunds");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Tedarikçi iadeleri getirilemedi");
    }

    return response.json();
  },

  // İade açıklamasını güncelle
  async updateMyRefundReason(
    refundId: string,
    reason: string
  ): Promise<MyRefund> {
    const response = await fetch("/api/my-refunds", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refundId, reason }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "İade açıklaması güncellenemedi");
    }

    return response.json();
  },
};
