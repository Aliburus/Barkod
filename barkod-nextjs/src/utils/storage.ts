import { Product, Sale } from "../types";

const PRODUCTS_KEY = "barcode_products";
const SALES_KEY = "barcode_sales";

export const storageUtils = {
  // Product operations
  getProducts: (): Product[] => {
    const data = localStorage.getItem(PRODUCTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveProducts: (products: Product[]): void => {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  },

  addProduct: (product: Product): void => {
    const products = storageUtils.getProducts();
    products.push(product);
    storageUtils.saveProducts(products);
  },

  updateProduct: (id: string, updates: Partial<Product>): boolean => {
    const products = storageUtils.getProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return false;

    products[index] = {
      ...products[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    storageUtils.saveProducts(products);
    return true;
  },

  deleteProduct: (id: string): boolean => {
    const products = storageUtils.getProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) return false;

    storageUtils.saveProducts(filtered);
    return true;
  },

  getProductByBarcode: (barcode: string): Product | null => {
    const products = storageUtils.getProducts();
    return products.find((p) => p.barcode === barcode) || null;
  },

  // Sales operations
  getSales: (): Sale[] => {
    const data = localStorage.getItem(SALES_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSales: (sales: Sale[]): void => {
    localStorage.setItem(SALES_KEY, JSON.stringify(sales));
  },

  addSale: (sale: Sale): void => {
    const sales = storageUtils.getSales();
    sales.push(sale);
    storageUtils.saveSales(sales);
  },

  // Helper functions
  updateStock: (barcode: string, quantity: number): boolean => {
    const product = storageUtils.getProductByBarcode(barcode);
    if (!product || product.stock < quantity) return false;

    return storageUtils.updateProduct(product.id, {
      stock: product.stock - quantity,
    });
  },

  getLowStockProducts: (threshold: number = 5): Product[] => {
    return storageUtils.getProducts().filter((p) => p.stock <= threshold);
  },
};
