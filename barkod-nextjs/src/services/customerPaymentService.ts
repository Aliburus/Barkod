import axios from "axios";
import { CustomerPayment } from "../types";

const API_URL = "";

export const customerPaymentService = {
  getAll: async (
    customerId?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    payments: CustomerPayment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams();
    if (customerId) params.append("customerId", customerId);
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    params.append("page", page.toString());
    params.append("limit", limit.toString());

    const url = `${API_URL}/api/customer-payments?${params.toString()}`;
    const res = await axios.get(url);

    return {
      payments: res.data.payments.map((p: CustomerPayment) => ({
        ...p,
        id: p._id,
      })),
      pagination: res.data.pagination,
    };
  },

  create: async (
    payment: Omit<CustomerPayment, "_id" | "id" | "createdAt" | "updatedAt">
  ): Promise<CustomerPayment> => {
    const res = await axios.post(`${API_URL}/api/customer-payments`, payment);
    const p = res.data;
    return { ...p, id: p._id };
  },

  update: async (
    id: string,
    update: Partial<CustomerPayment>
  ): Promise<CustomerPayment> => {
    const res = await axios.patch(`${API_URL}/api/customer-payments`, {
      id,
      ...update,
    });
    const p = res.data;
    return { ...p, id: p._id };
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/customer-payments?id=${id}`);
  },

  getByCustomerId: async (customerId: string): Promise<CustomerPayment[]> => {
    const res = await axios.get(
      `${API_URL}/api/customer-payments?customerId=${customerId}`
    );
    return res.data.payments.map((p: CustomerPayment) => ({
      ...p,
      id: p._id,
    }));
  },

  getTotalByCustomer: async (customerId: string): Promise<number> => {
    const res = await axios.get(
      `${API_URL}/api/customer-payments?customerId=${customerId}`
    );
    const payments = res.data.payments;
    return payments.reduce((total: number, payment: CustomerPayment) => {
      return total + (payment.amount || 0);
    }, 0);
  },
};
