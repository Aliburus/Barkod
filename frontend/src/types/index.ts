export interface Product {
  id: string;
  barcode: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  brand: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  soldAt: string;
}

export interface ScanResult {
  text: string;
  format: string;
}