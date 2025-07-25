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
  productName?: string;
  quantity: number;
  price?: number;
  total?: number;
  soldAt: string;
  customer?: string;
  paymentType?: string;
  status?: "active" | "deleted";
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
  color?: string;
  debt?: number;
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

export interface Payment {
  id: string;
  _id?: string;
  company?: string;
  name: string;
  amount: number;
  date: string; // <-- backend ile uyumlu zorunlu alan
  dueDate?: string;
  isPaid?: boolean;
  paymentType?: string;
  status?: "active" | "deleted";
}

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

export interface KasaRow {
  date: string;
  nakit: number;
  krediKarti: number;
  havale: number;
  diger: number;
  pos: number;
  tahsilat: number;
  harcama: number;
  banka: number;
  oncekiKasa: number;
  gunSonuKasa: number;
}
