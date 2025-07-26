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
  supplier?: string[];
  oem?: string;
  kod1?: string;
  kod2?: string;
  usedCars?: string[];
}

export interface Sale {
  _id: string;
  customer: string;
  customerId?: string;
  items?: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  paymentType: string;
  soldAt: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
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
  description?: string;
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

export interface SaleItem {
  productName: string;
  barcode: string;
  quantity: number;
  price: number;
}

export interface Debt {
  _id?: string;
  customerId: string | { _id: string; name: string; phone?: string };
  amount: number;
  paidAmount?: number;
  description?: string;
  isPaid?: boolean;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  type?: string;
  saleId?: {
    _id?: string;
    items?: SaleItem[];
    productName?: string;
    quantity?: number;
    price?: number;
    totalAmount?: number;
    createdAt?: string;
  };
}
