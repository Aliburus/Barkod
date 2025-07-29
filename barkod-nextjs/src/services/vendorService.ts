import { Vendor, PurchaseOrder, VendorDebt, VendorPayment } from "../types";

const API_BASE_URL = "/api";

export const vendorService = {
  // Vendor CRUD operations
  async getAll(
    search?: string,
    page: number = 1
  ): Promise<{ vendors: Vendor[]; total: number }> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", page.toString());

    const response = await fetch(`${API_BASE_URL}/vendors?${params}`);
    if (!response.ok) throw new Error("Tedarikçiler yüklenirken hata oluştu");
    return response.json();
  },

  async getById(id: string): Promise<Vendor> {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}`);
    if (!response.ok) throw new Error("Tedarikçi bulunamadı");
    return response.json();
  },

  async create(
    vendor: Omit<Vendor, "_id" | "createdAt" | "updatedAt">
  ): Promise<Vendor> {
    const response = await fetch(`${API_BASE_URL}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendor),
    });
    if (!response.ok) throw new Error("Tedarikçi eklenirken hata oluştu");
    return response.json();
  },

  async update(id: string, vendor: Partial<Vendor>): Promise<Vendor> {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendor),
    });
    if (!response.ok) throw new Error("Tedarikçi güncellenirken hata oluştu");
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/vendors/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Tedarikçi silinirken hata oluştu");
  },

  // Purchase Order operations
  async getPurchaseOrders(vendorId?: string): Promise<PurchaseOrder[]> {
    const params = new URLSearchParams();
    if (vendorId) params.append("vendorId", vendorId);

    const response = await fetch(`${API_BASE_URL}/purchase-orders?${params}`);
    if (!response.ok) throw new Error("Siparişler yüklenirken hata oluştu");
    return response.json();
  },

  async createPurchaseOrder(
    order: Omit<PurchaseOrder, "_id" | "createdAt" | "updatedAt">
  ): Promise<PurchaseOrder> {
    const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error("Sipariş oluşturulurken hata oluştu");
    return response.json();
  },

  async updatePurchaseOrder(
    id: string,
    order: Partial<PurchaseOrder>
  ): Promise<PurchaseOrder> {
    const response = await fetch(`${API_BASE_URL}/purchase-orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    if (!response.ok) throw new Error("Sipariş güncellenirken hata oluştu");
    return response.json();
  },

  // Vendor Debt operations
  async getVendorDebts(vendorId?: string): Promise<VendorDebt[]> {
    const params = new URLSearchParams();
    if (vendorId) params.append("vendorId", vendorId);

    const response = await fetch(`${API_BASE_URL}/vendor-debts?${params}`);
    if (!response.ok)
      throw new Error("Tedarikçi borçları yüklenirken hata oluştu");
    return response.json();
  },

  async createVendorDebt(
    debt: Omit<VendorDebt, "_id" | "createdAt" | "updatedAt">
  ): Promise<VendorDebt> {
    const response = await fetch(`${API_BASE_URL}/vendor-debts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(debt),
    });
    if (!response.ok) throw new Error("Tedarikçi borcu eklenirken hata oluştu");
    return response.json();
  },

  // Vendor Payment operations
  async getVendorPayments(vendorId?: string): Promise<VendorPayment[]> {
    const params = new URLSearchParams();
    if (vendorId) params.append("vendorId", vendorId);

    const response = await fetch(`${API_BASE_URL}/vendor-payments?${params}`);
    if (!response.ok)
      throw new Error("Tedarikçi ödemeleri yüklenirken hata oluştu");
    return response.json();
  },

  async createVendorPayment(
    payment: Omit<VendorPayment, "_id" | "createdAt" | "updatedAt">
  ): Promise<VendorPayment> {
    const response = await fetch(`${API_BASE_URL}/vendor-payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payment),
    });
    if (!response.ok)
      throw new Error("Tedarikçi ödemesi eklenirken hata oluştu");
    return response.json();
  },
};
