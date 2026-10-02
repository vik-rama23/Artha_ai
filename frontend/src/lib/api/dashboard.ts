import { serverApiClient } from "./serverClient";

import type { DashboardData } from "@/types/dashboard";

export async function getDashboard(
  month?: string
): Promise<DashboardData> {
  const endpoint = month
    ? `/api/v1/dashboard?month=${encodeURIComponent(
        month
      )}`
    : "/api/v1/dashboard";

  return serverApiClient<DashboardData>(
    endpoint
  );
}