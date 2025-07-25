import axios from "axios";

export interface Expense {
  id?: string;
  _id?: string;
  amount: number;
  desc?: string;
  frequency?: string;
  paymentDate: string;
  status?: string;
  createdAt?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const expenseService = {
  getAll: async (): Promise<Expense[]> => {
    const res = await axios.get(`${API_URL}/api/giderler`);
    return res.data;
  },
  create: async (
    expense: Omit<Expense, "id" | "_id" | "status" | "createdAt">
  ): Promise<Expense> => {
    const res = await axios.post(`${API_URL}/api/giderler`, {
      ...expense,
      status: "active",
    });
    return res.data;
  },
  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/giderler`, {
      data: { id },
      headers: { "Content-Type": "application/json" },
    });
  },
};
