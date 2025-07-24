"use client";
import ProductsPage from "../../components/Pages/ProductsPage";
import { useEffect, useState } from "react";
import { productService } from "../../services/productService";
import { Product } from "../../types";

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    productService.getAll().then(setProducts);
  }, []);
  return (
    <ProductsPage
      products={products}
      onEdit={() => {}}
      onDelete={() => {}}
      onView={() => {}}
      showTotalValue={true}
    />
  );
}
