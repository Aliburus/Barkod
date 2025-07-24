import axios from "axios";
import type { Payment } from "../types";

export const paymentService = {
  getAll: async (): Promise<Payment[]> => {
    const res = await axios.get("/api/payments");
    return res.data;
  },
  create: async (payment: Payment): Promise<Payment> => {
    const res = await axios.post("/api/payments", payment);
    return res.data;
  },
};
