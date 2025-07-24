import axios from "axios";
import { Customer, AccountTransaction } from "../types";

const CUSTOMER_API = "/api/customers";
const TRANSACTION_API = "/api/account-transactions";

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const res = await axios.get(CUSTOMER_API);
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
};

export const accountTransactionService = {
  getAll: async (customerId?: string): Promise<AccountTransaction[]> => {
    const url = customerId
      ? `${TRANSACTION_API}?customer=${customerId}`
      : TRANSACTION_API;
    const res = await axios.get(url);
    return res.data.map((t: AccountTransaction) => ({
      ...t,
      id: t._id || t.id,
    }));
  },
  create: async (
    transaction: Omit<AccountTransaction, "id" | "_id">
  ): Promise<AccountTransaction> => {
    const res = await axios.post(TRANSACTION_API, transaction);
    const t = res.data;
    return { ...t, id: t._id || t.id };
  },
};
