"use client";
import React, { useState, useEffect } from "react";
import Header from "../../components/Layout/Header";
import Navigation from "../../components/Layout/Navigation";
import { Building2, Phone, MapPin, Trash2, Plus } from "lucide-react";
import { companyService } from "../../services/companyService";
import Notification from "../../components/Layout/Notification";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  _id?: string;
}

// Kullanılmayan değişkeni kaldır

const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await companyService.getAll();
      console.log("[FIRMA LISTESI]", data);
      setCompanies(data);
    } catch (err) {
      console.error("[FIRMA LISTESI HATA]", err);
      setNotification({ message: "Firma listesi alınamadı", type: "error" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      const resp = await companyService.create(form);
      console.log("[FIRMA EKLE]", resp);
      setNotification({ message: "Firma eklendi", type: "success" });
    } catch (err) {
      console.error("[FIRMA EKLE HATA]", err);
      setNotification({ message: "Firma eklenemedi", type: "error" });
    }
    setForm({ name: "", phone: "", address: "" });
    setLoading(false);
    fetchCompanies();
  };

  const handleDelete = async (id: string) => {
    await companyService.delete(id);
    fetchCompanies();
  };

  return (
    <>
      <Header
        lowStockCount={0}
        activeTab={"companies"}
        onAddProduct={() => {}}
      />
      <Navigation activeTab={"companies"} onTabChange={() => {}} />
      <div className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
        {/* Üstte yatay ekleme alanı */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-4 flex flex-wrap gap-4 items-center">
          <form
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-2 items-end w-full"
          >
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Firma Adı
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Firma Adı"
                className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefon
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Telefon"
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex flex-col flex-1 min-w-[120px]">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adres
              </label>
              <input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Adres"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm flex items-center gap-2"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />{" "}
              {loading ? "Ekleniyor..." : "Firma Ekle"}
            </button>
          </form>
        </div>
        {/* Altta yatay firma listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-0 w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm align-middle">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Firma Adı
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Telefon
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Adres
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center py-8 text-gray-500 dark:text-gray-400"
                    >
                      Kayıtlı firma yok
                    </td>
                  </tr>
                ) : (
                  companies.map((company) => (
                    <tr
                      key={company._id || company.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td
                        className="px-4 py-2 text-sm text-primary-600 underline cursor-pointer"
                        onClick={() => router.push(`/companies/${company._id}`)}
                      >
                        <Building2 className="w-4 h-4 text-primary-600" />{" "}
                        {company.name}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {company.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {company.phone}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">
                        {company.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {company.address}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() =>
                            handleDelete(company._id || company.id)
                          }
                          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" /> Sil
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {notification && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-xs">
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        </div>
      )}
    </>
  );
};

export default CompaniesPage;
