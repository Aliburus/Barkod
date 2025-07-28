import { Debt } from "../types";

export interface CreateDebtData {
  customerId: string;
  amount: number;
  description: string;
  type?: "sale" | "manual" | "adjustment";
  saleId?: string;
  dueDate?: Date;
}

export interface UpdateDebtData {
  amount?: number;
  description?: string;
  isPaid?: boolean;
  dueDate?: Date;
}

class DebtService {
  private baseUrl = "/api/debts";

  // Tüm borçları getir
  async getAll(): Promise<Debt[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Borçlar getirilemedi");
    }
    return response.json();
  }

  // Belirli borç kaydını getir
  async getById(id: string): Promise<Debt> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Borç getirilemedi");
    }
    return response.json();
  }

  // Müşterinin borçlarını getir
  async getByCustomerId(customerId: string): Promise<{
    debts: Debt[];
    totalDebt: number;
    totalDebts: number;
  }> {
    const response = await fetch(`${this.baseUrl}/customer/${customerId}`);
    if (!response.ok) {
      throw new Error("Müşteri borçları getirilemedi");
    }
    return response.json();
  }

  // Yeni borç ekle
  async create(data: CreateDebtData): Promise<Debt> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Borç eklenemedi");
    }
    return response.json();
  }

  // Müşteriye borç ekle
  async createForCustomer(
    customerId: string,
    data: Omit<CreateDebtData, "customerId">
  ): Promise<Debt> {
    const response = await fetch(`${this.baseUrl}/customer/${customerId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Müşteri borcu eklenemedi");
    }
    return response.json();
  }

  // Borç güncelle
  async update(id: string, data: UpdateDebtData): Promise<Debt> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error("Borç güncellenemedi");
    }
    return response.json();
  }

  // Borç sil
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}?id=${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Borç silinemedi");
    }
  }

  // Borç ödemesi yap (artık sadece isPaid güncelleniyor)
  async makePayment(id: string, paymentAmount: number): Promise<Debt> {
    const debt = await this.getById(id);
    const isPaid = paymentAmount >= debt.amount;

    return this.update(id, {
      isPaid,
    });
  }
}

export const debtService = new DebtService();
