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

export interface SubCustomer {
  id: string;
  _id?: string;
  customerId: string | { _id: string; name: string; phone?: string };
  name: string;
  phone?: string;
  status: "active" | "inactive" | "deleted";
  color?: "yellow" | "red" | "blue" | "green" | "purple" | "orange";
  createdAt: string;
  updatedAt: string;
}

export interface CustomerPayment {
  _id?: string;
  customerId: string | { _id: string; name: string; phone?: string };
  subCustomerId?: string | { _id: string; name: string; phone?: string };
  amount: number;
  paymentDate: string;
  paymentType: "nakit" | "kredi_karti" | "havale" | "cek" | "diger";
  description?: string;
  debtId?: string | { _id: string; amount: number; description: string };
  saleId?: string | { _id: string; totalAmount: number; items: SaleItem[] };
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  status: "active" | "cancelled" | "refunded";
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
  subCustomerId?: string | { _id: string; name: string; phone?: string };
  amount: number;
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
