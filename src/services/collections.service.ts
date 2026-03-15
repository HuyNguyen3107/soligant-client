import { http } from "../lib/http";

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail: string;
  isActive?: boolean;
  isFeatured: boolean;
  createdAt?: string;
}

export interface PublicProductCategory {
  id: string;
  name: string;
  updatedAt: string;
}

export interface CollectionProductCategory {
  id: string;
  name: string;
  productCount: number;
}

export interface CollectionProduct {
  id: string;
  collectionId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  variantSymbol: string;
  description: string;
  image: string;
  size: "20x20" | "18x18" | "15x15";
  legoQuantity: number;
  allowVariableLegoCount: boolean;
  legoCountMin: number;
  legoCountMax: number;
  additionalLegoPrice: number;
  price: number;
  updatedAt: string;
}

export interface PublicCollectionProductsPayload {
  collection: Collection;
  categories: CollectionProductCategory[];
  products: CollectionProduct[];
}

export const getPublicCollections = async () => {
  const { data } = await http.get<Collection[]>("/public/collections");
  return data;
};

export const getPublicCollectionBySlug = async (slug: string) => {
  const { data } = await http.get<Collection>(`/public/collections/${slug}`);
  return data;
};

export const getPublicProductCategories = async () => {
  const { data } = await http.get<PublicProductCategory[]>("/public/product-categories");
  return data;
};

export const getPublicCollectionProducts = async (
  slug: string,
  categoryId?: string,
) => {
  const { data } = await http.get<PublicCollectionProductsPayload>(
    `/public/collections/${slug}/products`,
    {
      params: categoryId ? { categoryId } : undefined,
    },
  );
  return data;
};
