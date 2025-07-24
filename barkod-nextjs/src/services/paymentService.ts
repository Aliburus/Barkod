import axios from "axios";

export const paymentService = {
  getAll: async () => {
    const res = await axios.get("/api/payments");
    return res.data;
  },
  create: async (payment: any) => {
    const res = await axios.post("/api/payments", payment);
    return res.data;
  },
};
