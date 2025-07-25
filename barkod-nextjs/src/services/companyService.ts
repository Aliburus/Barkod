const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const companyService = {
  async getAll() {
    const res = await fetch(`${API_URL}/api/companies`, { cache: "no-store" });
    return res.json();
  },
  async getById(id: string) {
    const res = await fetch(`${API_URL}/api/companies/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Firma bulunamadı");
    return res.json();
  },
  async create(data: { name: string; phone?: string; address?: string }) {
    const res = await fetch(`${API_URL}/api/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async delete(id: string) {
    const res = await fetch(`${API_URL}/api/companies/${id}`, {
      method: "DELETE",
    });
    return res.json();
  },
};
