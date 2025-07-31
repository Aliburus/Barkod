import { Refund } from "../types";

export const refundService = {
  // İade oluştur
  async createRefund(refundData: {
    debtId: string;
    productId: string;
    productName: string;
    barcode: string;
    quantity: number;
    refundAmount: number;
    customerId: string;
    subCustomerId?: string;
    reason?: string;
  }): Promise<Refund> {
    const response = await fetch("/api/refunds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(refundData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "İade oluşturulamadı");
    }

    return response.json();
  },

  // Borç için iadeleri getir
  async getRefundsByDebtId(debtId: string): Promise<Refund[]> {
    const response = await fetch(`/api/refunds?debtId=${debtId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "İadeler getirilemedi");
    }

    return response.json();
  },

  // Müşteri için iadeleri getir
  async getRefundsByCustomerId(customerId: string): Promise<Refund[]> {
    const response = await fetch(`/api/refunds?customerId=${customerId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "İadeler getirilemedi");
    }

    return response.json();
  },

  // Tüm iadeleri getir
  async getAllRefunds(): Promise<Refund[]> {
    const response = await fetch("/api/refunds");

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "İadeler getirilemedi");
    }

    return response.json();
  },
};
