export interface Product {
  id: string;
  _id?: string;
  barcode: string;
  name: string;
  price: number;
  purchasePrice?: number;
  stock: number;
  category: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  _id?: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  soldAt: string;
  customer?: string;
  paymentType?: string;
}

export interface ScanResult {
  text: string;
  format: string;
}

// Cari yönetimi için yeni tipler
export interface Customer {
  id: string;
  _id?: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountTransaction {
  id: string;
  _id?: string;
  customer: string | Customer;
  date: string;
  amount: number;
  type: "borc" | "odeme";
  description?: string;
}
