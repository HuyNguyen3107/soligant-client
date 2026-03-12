import { http } from "../lib/http";
import type { ProductCategory } from "../pages/Dashboard/types";

export interface ProductCategoryPayload {
  name: string;
}

export const getProductCategories = async () => {
  const { data } = await http.get<ProductCategory[]>("/product-categories");
  return data;
};

export const createProductCategory = async (payload: ProductCategoryPayload) => {
  const { data } = await http.post<ProductCategory>("/product-categories", payload);
  return data;
};

export const updateProductCategory = async (
  id: string,
  payload: ProductCategoryPayload,
) => {
  const { data } = await http.patch<ProductCategory>(`/product-categories/${id}`, payload);
  return data;
};

export const deleteProductCategory = async (id: string) => {
  await http.delete(`/product-categories/${id}`);
};