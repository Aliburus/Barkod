"use client";

import React, { useEffect, useState } from "react";
import { Vendor } from "../../types";
import { vendorService } from "../../services/vendorService";
import { useRouter } from "next/navigation";
import { Trash2, Search, Plus, Edit } from "lucide-react";

// Debounce utility function
const debounce = (func: (search: string) => void, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(search: string) {
    const later = () => {
      clearTimeout(timeout);
      func(search);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const VendorsPage: React.FC = () => {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    contactPerson: "",
    notes: "",
  });
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "warning";
    show: boolean;
  }>({ message: "", type: "success", show: false });

  const fetchVendors = async (search?: string) => {
    setLoading(true);
    try {
      const data = await vendorService.getAll(search);
      setVendors(data.vendors);
    } catch (error) {
      console.error("Tedarikçiler yüklenirken hata:", error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debounce(fetchVendors, 300)(value);
  };

  const handleVendorFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setVendorForm({ ...vendorForm, [e.target.name]: e.target.value });
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingVendor) {
        await vendorService.update(editingVendor._id!, vendorForm);
      } else {
        await vendorService.create({ ...vendorForm, status: "active" });
      }
      setVendorForm({
        name: "",
        phone: "",
        email: "",
        address: "",
        taxNumber: "",
        contactPerson: "",
        notes: "",
      });
      setShowVendorForm(false);
      setEditingVendor(null);
      fetchVendors(searchTerm);
    } catch (error) {
      console.error("Tedarikçi kaydedilirken hata:", error);
      setNotification({
        message: "Tedarikçi kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.",
        type: "error",
        show: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorForm({
      name: vendor.name || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      taxNumber: vendor.taxNumber || "",
      contactPerson: vendor.contactPerson || "",
      notes: vendor.notes || "",
    });
    setShowVendorForm(true);
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm("Bu tedarikçiyi silmek istediğinizden emin misiniz?")) {
      return;
    }
    setDeletingId(id);
    try {
      await vendorService.delete(id);
      fetchVendors(searchTerm);
    } catch (error) {
      console.error("Tedarikçi silinirken hata:", error);
      setNotification({
        message: "Tedarikçi silinirken bir hata oluştu. Lütfen tekrar deneyin.",
        type: "error",
        show: true,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleVendorClick = (vendorId: string) => {
    router.push(`/vendors/${vendorId}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 mt-4">
      {/* Search and Add Vendor */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Tedarikçi adı, telefon veya email ara..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (submitting) return;
              setEditingVendor(null);
              setVendorForm({
                name: "",
                phone: "",
                email: "",
                address: "",
                taxNumber: "",
                contactPerson: "",
                notes: "",
              });
              setShowVendorForm(true);
            }}
            disabled={submitting}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            {submitting ? "İşleniyor..." : "Tedarikçi Ekle"}
          </button>
        </div>
      </div>

      {/* Vendors List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Tedarikçi Adı
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Telefon
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {vendors.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center py-8 text-gray-500 dark:text-gray-400"
                  >
                    {loading ? "Yükleniyor..." : "Kayıtlı tedarikçi yok"}
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleVendorClick(vendor._id!)}
                        className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left w-full"
                      >
                        {vendor.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                      {vendor.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-300">
                      {vendor.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditVendor(vendor)}
                          disabled={submitting || deletingId === vendor._id}
                          className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Düzenle"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteVendor(vendor._id!)}
                          disabled={submitting || deletingId === vendor._id}
                          className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors flex items-center gap-1 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Sil"
                        >
                          {deletingId === vendor._id ? (
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Form Modal */}
      {showVendorForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {editingVendor ? "Tedarikçi Düzenle" : "Yeni Tedarikçi Ekle"}
            </h2>
            <form onSubmit={handleVendorSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tedarikçi Adı *
                </label>
                <input
                  type="text"
                  name="name"
                  value={vendorForm.name}
                  onChange={handleVendorFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon
                </label>
                <input
                  type="text"
                  name="phone"
                  value={vendorForm.phone}
                  onChange={handleVendorFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={vendorForm.email}
                  onChange={handleVendorFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adres
                </label>
                <textarea
                  name="address"
                  value={vendorForm.address}
                  onChange={handleVendorFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vergi Numarası
                </label>
                <input
                  type="text"
                  name="taxNumber"
                  value={vendorForm.taxNumber}
                  onChange={handleVendorFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  İletişim Kişisi
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={vendorForm.contactPerson}
                  onChange={handleVendorFormChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notlar
                </label>
                <textarea
                  name="notes"
                  value={vendorForm.notes}
                  onChange={handleVendorFormChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Kaydediliyor..."
                    : editingVendor
                    ? "Güncelle"
                    : "Ekle"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVendorForm(false);
                    setEditingVendor(null);
                    setVendorForm({
                      name: "",
                      phone: "",
                      email: "",
                      address: "",
                      taxNumber: "",
                      contactPerson: "",
                      notes: "",
                    });
                  }}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-semibold"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg text-white ${
              notification.type === "success"
                ? "bg-green-500"
                : notification.type === "error"
                ? "bg-red-500"
                : "bg-yellow-500"
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{notification.message}</span>
              <button
                onClick={() =>
                  setNotification({ ...notification, show: false })
                }
                className="ml-4 text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsPage;
