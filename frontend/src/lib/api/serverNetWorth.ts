import { serverApiClient } from "./serverClient";
import type { NetWorthResponse } from "./netWorth";

export async function getServerNetWorth(
  asOfDate?: string
): Promise<NetWorthResponse> {
  const query = asOfDate
    ? `?as_of_date=${encodeURIComponent(asOfDate)}`
    : "";

  return serverApiClient<NetWorthResponse>(
    `/api/v1/net-worth${query}`
  );
}
