import axios from "axios";
import type { Payment } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const paymentService = {
  getAll: async (): Promise<Payment[]> => {
    const res = await axios.get(`${API_URL}/api/payments`);
    return res.data;
  },
  create: async (payment: Payment): Promise<Payment> => {
    const res = await axios.post(`${API_URL}/api/payments`, payment);
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await axios.patch(`${API_URL}/api/payments/${id}`, { status: "deleted" });
  },
  deleteGroup: async (filter: Partial<Payment>): Promise<void> => {
    await axios.patch(`${API_URL}/api/payments/group-delete`, {
      ...filter,
      status: "deleted",
    });
  },
  update: async (id: string, update: Partial<Payment>): Promise<Payment> => {
    const res = await axios.patch(`${API_URL}/api/payments/${id}`, update);
    return res.data;
  },
};
