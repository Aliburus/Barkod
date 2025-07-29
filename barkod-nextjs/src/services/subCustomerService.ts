import axios from "axios";
import { SubCustomer } from "../types";

const API_URL = "";

export const subCustomerService = {
  getAll: async (
    customerId?: string,
    search?: string,
    skip: number = 0,
    limit: number = 50
  ): Promise<{
    subCustomers: SubCustomer[];
    hasMore: boolean;
    nextSkip: number;
  }> => {
    const params = new URLSearchParams();
    if (customerId) params.append("customerId", customerId);
    if (search) params.append("search", search);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const url = `${API_URL}/api/sub-customers?${params.toString()}`;
    const res = await axios.get(url);

    return {
      subCustomers: res.data.subCustomers.map((sc: SubCustomer) => ({
        ...sc,
        id: sc._id,
      })),
      hasMore: res.data.hasMore,
      nextSkip: res.data.nextSkip,
    };
  },

  create: async (
    subCustomer: Omit<SubCustomer, "_id" | "id" | "createdAt" | "updatedAt">
  ): Promise<SubCustomer> => {
    const res = await axios.post(`${API_URL}/api/sub-customers`, subCustomer);
    const sc = res.data;
    return { ...sc, id: sc._id };
  },

  update: async (
    id: string,
    update: Partial<SubCustomer>
  ): Promise<SubCustomer> => {
    const res = await axios.patch(`${API_URL}/api/sub-customers`, {
      id,
      ...update,
    });
    const sc = res.data;
    return { ...sc, id: sc._id };
  },

  delete: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/api/sub-customers?id=${id}`);
  },

  getByCustomerId: async (customerId: string): Promise<SubCustomer[]> => {
    const res = await axios.get(
      `${API_URL}/api/sub-customers?customerId=${customerId}`
    );
    return res.data.subCustomers.map((sc: SubCustomer) => ({
      ...sc,
      id: sc._id,
    }));
  },

  closeAccount: async (id: string): Promise<SubCustomer> => {
    const res = await axios.patch(`${API_URL}/api/sub-customers`, {
      id,
      status: "inactive",
    });
    const sc = res.data;
    return { ...sc, id: sc._id };
  },

  openAccount: async (id: string): Promise<SubCustomer> => {
    const res = await axios.patch(`${API_URL}/api/sub-customers`, {
      id,
      status: "active",
    });
    const sc = res.data;
    return { ...sc, id: sc._id };
  },
};
