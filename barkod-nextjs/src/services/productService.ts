import axios from "axios";
import { Product } from "../types";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
const API_URL = `${BACKEND_URL}/api/products`;

export interface SaleCreate {
  barcode: string;
  quantity: number;
  soldAt: string;
  price: number;
  productName: string;
}

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const res = await axios.get(API_URL);
    return res.data.map((p: any) => ({ ...p, id: p._id }));
  },
  create: async (
    product: Omit<Product, "id" | "createdAt" | "updatedAt">
  ): Promise<Product> => {
    const res = await axios.post(API_URL, product);
    const p = res.data;
    return { ...p, id: p._id };
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
  getAllSales: async (): Promise<any[]> => {
    const res = await axios.get(`${BACKEND_URL}/api/sales`);
    return res.data.map((s: any) => ({
      ...s,
      id: s.id || s._id,
      total: s.price * s.quantity,
    }));
  },
};
