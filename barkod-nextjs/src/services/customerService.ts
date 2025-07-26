import axios from "axios";
import { Customer } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const CUSTOMER_API = "/api/customers";

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const res = await axios.get(`${API_URL}/api/customers`);
    return res.data.map((c: Customer) => ({ ...c, id: c._id || c.id }));
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
