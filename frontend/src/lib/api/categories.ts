import { apiClient } from "./client";

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  category_type: "INCOME" | "EXPENSE";
  icon: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryListResponse = {
  items: Category[];
  total: number;
};

export type CreateCategoryPayload = {
  name: string;
  category_type: "INCOME" | "EXPENSE";
  icon?: string | null;
};

export type UpdateCategoryPayload = {
  name?: string;
  category_type?: "INCOME" | "EXPENSE";
  icon?: string | null;
  is_active?: boolean;
};

export async function getCategories(
  categoryType?: "INCOME" | "EXPENSE"
): Promise<CategoryListResponse> {
  const params = new URLSearchParams();

  if (categoryType) {
    params.set(
      "category_type",
      categoryType
    );
  }

  const queryString =
    params.toString();

  const endpoint = queryString
    ? `/api/v1/categories?${queryString}`
    : "/api/v1/categories";

  return apiClient<CategoryListResponse>(
    endpoint
  );
}

export async function getCategory(
  categoryId: string
): Promise<Category> {
  return apiClient<Category>(
    `/api/v1/categories/${categoryId}`
  );
}

export async function createCategory(
  payload: CreateCategoryPayload
): Promise<Category> {
  return apiClient<Category>(
    "/api/v1/categories",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateCategory(
  categoryId: string,
  payload: UpdateCategoryPayload
): Promise<Category> {
  return apiClient<Category>(
    `/api/v1/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteCategory(
  categoryId: string
): Promise<void> {
  await apiClient<void>(
    `/api/v1/categories/${categoryId}`,
    {
      method: "DELETE",
    }
  );
}