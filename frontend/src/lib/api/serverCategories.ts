import { serverApiClient } from "./serverClient";

import type {
  Category,
  CategoryListResponse,
} from "./categories";

export async function getServerCategories(): Promise<Category[]> {
  const response =
    await serverApiClient<CategoryListResponse>(
      "/api/v1/categories"
    );

  return response.items;
}