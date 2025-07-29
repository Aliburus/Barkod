import axios from "axios";
import { Customer } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const CUSTOMER_API = "/api/customers";

export const customerService = {
  getAll: async (
    search?: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<{
    customers: Customer[];
    hasMore: boolean;
    nextSkip: number;
  }> => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const url = `${API_URL}/api/customers?${params.toString()}`;
    const res = await axios.get(url);

    return {
      customers: res.data.customers.map((c: Customer) => ({
        ...c,
        id: c._id || c.id,
      })),
      hasMore: res.data.hasMore,
      nextSkip: res.data.nextSkip,
    };
  },
  create: async (
    customer: Omit<Customer, "id" | "_id" | "createdAt" | "updatedAt">
  ): Promise<Customer> => {
    const res = await axios.post(CUSTOMER_API, customer);
    const c = res.data;
    return { ...c, id: c._id || c.id };
  },
  update: async (id: string, update: Partial<Customer>) => {
    const res = await axios.patch("/api/customers", { id, ...update });
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await axios.delete(`/api/customers/${id}`);
  },
};
