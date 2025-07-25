import axios from "axios";
import { Product, Sale } from "../types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/products";

export interface SaleCreate {
  barcode: string;
  quantity: number;
  soldAt: string;
  price: number;
  productName: string;
  customer?: string;
  paymentType?: string;
}

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const res = await axios.get(`${API_URL}/api/products`);
    return res.data.map((p: Product) => ({ ...p, id: p._id || p.id }));
  },
  create: async (product: Product): Promise<Product> => {
    try {
      const res = await axios.post(API_URL, {
        ...product,
        purchasePrice: product.purchasePrice ?? 0,
        createdAt: product.createdAt ?? new Date().toISOString(),
        updatedAt: product.updatedAt ?? new Date().toISOString(),
      });
      const p = res.data;
      return { ...p, id: p._id };
    } catch (error: any) {
      if (error?.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  },
  getProductByBarcode: async (barcode: string): Promise<Product | null> => {
    const res = await axios.get(`${API_URL}?barcode=${barcode}`);
    if (res.data.length > 0) {
      const p = res.data[0];
      return { ...p, id: p._id };
    }
    return null;
  },
  deleteProduct: async (barcode: string): Promise<void> => {
    await axios.delete(`${API_URL}/${barcode}`);
  },
  update: async (
    barcode: string,
    updates: Partial<Product>
  ): Promise<Product> => {
    const res = await axios.patch(`${API_URL}/${barcode}`, updates);
    const p = res.data;
    return { ...p, id: p._id };
  },
  getLowStockProducts: async (threshold: number = 5): Promise<Product[]> => {
    const res = await axios.get(API_URL);
    return res.data.filter((p: Product) => p.stock <= threshold);
  },
  createSale: async (sale: SaleCreate): Promise<void> => {
    await axios.post(`${BACKEND_URL}/api/sales`, sale);
  },
  getAllSales: async (): Promise<Sale[]> => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/sales`);
      return res.data.map((s: Sale) => ({
        ...s,
        id: s._id || s.id,
        total: s.price && s.quantity ? s.price * s.quantity : 0,
      }));
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // Satış kaydı yoksa boş dizi dön
        return [];
      }
      // Diğer hatalarda notification için hata fırlat
      throw new Error(
        "Satış verisi alınamadı. Lütfen daha sonra tekrar deneyin."
      );
    }
  },
  deleteSalesByBarcode: async (barcode: string): Promise<void> => {
    await axios.patch(`${BACKEND_URL}/api/sales/by-barcode/${barcode}`, {
      status: "deleted",
    });
  },
};
