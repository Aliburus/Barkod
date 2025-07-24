"use client";
import SalesPage from "../../components/Pages/SalesPage";
import { productService } from "../../services/productService";
import { Product, Sale } from "../../types";
import { useEffect, useState } from "react";

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    productService.getAll().then(setProducts);
    productService.getAllSales().then(setSales);
  }, []);

  return <SalesPage sales={sales} products={products} showTotalValue={true} />;
}
