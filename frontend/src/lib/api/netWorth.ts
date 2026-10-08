import { apiClient } from "./client";

export type NetWorthItem = {
  id: string;
  user_id: string;
  name: string;
  item_type: "ASSET" | "LIABILITY";
  category: string;
  value: string;
  as_of_date: string;
  history_start_date: string;
  notes: string | null;
};

export type NetWorthBreakdownItem = {
  name: string;
  category: string;
  source: "ACCOUNT" | "MANUAL";
  value: string;
};

export type NetWorthHistoryPoint = {
  month: string;
  snapshot_date: string;
  assets: string;
  liabilities: string;
  net_worth: string;
  asset_change: string | null;
  liability_change: string | null;
  net_worth_change: string | null;
  is_current: boolean;
};

export type NetWorthResponse = {
  as_of_date: string;
  total_assets: string;
  total_liabilities: string;
  net_worth: string;
  asset_change: string;
  liability_change: string;
  net_worth_change: string;
  asset_items: NetWorthBreakdownItem[];
  liability_items: NetWorthBreakdownItem[];
  history: NetWorthHistoryPoint[];
};

export type CreateNetWorthItemPayload = {
  name: string;
  item_type: "ASSET" | "LIABILITY";
  category: string;
  value: number;
  as_of_date: string;
  history_start_date?: string;
  notes?: string | null;
};

export type UpdateNetWorthItemPayload =
  Partial<CreateNetWorthItemPayload>;

export async function getNetWorth(
  asOfDate?: string
): Promise<NetWorthResponse> {
  const query = asOfDate
    ? `?as_of_date=${encodeURIComponent(asOfDate)}`
    : "";

  return apiClient<NetWorthResponse>(
    `/api/v1/net-worth${query}`
  );
}

export async function getNetWorthItems(): Promise<NetWorthItem[]> {
  return apiClient<NetWorthItem[]>(
    "/api/v1/net-worth/items"
  );
}

export async function createNetWorthItem(
  payload: CreateNetWorthItemPayload
): Promise<NetWorthItem> {
  return apiClient<NetWorthItem>(
    "/api/v1/net-worth/items",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function updateNetWorthItem(
  itemId: string,
  payload: UpdateNetWorthItemPayload
): Promise<NetWorthItem> {
  return apiClient<NetWorthItem>(
    `/api/v1/net-worth/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteNetWorthItem(
  itemId: string
): Promise<void> {
  await apiClient<void>(
    `/api/v1/net-worth/items/${itemId}`,
    {
      method: "DELETE",
    }
  );
}
