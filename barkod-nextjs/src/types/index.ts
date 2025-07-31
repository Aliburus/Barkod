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
  shelf?: string;
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
  customerId?: string;
  subCustomerId?: string | { name: string; phone?: string };
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

export interface SaleItem {
  productName: string;
  barcode: string;
  quantity: number;
  price: number;
}

export interface DebtProductDetail {
  barcode: string;
  productId?: string | { _id: string; name: string; barcode: string };
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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
  // Satıştan gelen ürün bilgileri
  productBarcodes?: string[];
  productIds?: string[] | { _id: string; name: string; barcode: string }[];
  productDetails?: DebtProductDetail[];
  saleId?: {
    _id?: string;
    items?: SaleItem[];
    productName?: string;
    quantity?: number;
    price?: number;
    totalAmount?: number;
    barcode?: string;
    createdAt?: string;
  };
}

// Vendor Management Types
export interface Vendor {
  _id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  contactPerson?: string;
  notes?: string;
  status: "active" | "inactive" | "deleted";
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrder {
  _id?: string;
  vendorId: string | { _id: string; name: string };
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  status: "pending" | "confirmed" | "received" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  productId: string | { _id: string; name: string; barcode: string };
  productName: string;
  barcode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt?: string;
}

export interface MyDebtProductDetail {
  barcode: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface VendorDebt {
  _id?: string;
  vendorId: string | { _id: string; name: string };
  amount: number;
  description?: string;
  dueDate?: string;
  isPaid: boolean;
  purchaseOrderId?: string | { _id: string; orderNumber: string };
  // Alıştan gelen ürün bilgileri
  productBarcodes?: string[];
  productIds?: string[];
  productDetails?: MyDebtProductDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface VendorPayment {
  _id?: string;
  vendorId: string | { _id: string; name: string };
  amount: number;
  paymentDate: string;
  paymentType: "nakit" | "havale" | "cek" | "diger";
  description?: string;
  debtId?: string | { _id: string; amount: number; description: string };
  receiptNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
