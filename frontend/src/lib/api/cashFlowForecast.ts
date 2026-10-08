import { serverApiClient } from "./serverClient";

import type { CashFlowForecast } from "@/types/cashFlowForecast";

export async function getCashFlowForecast(
  forecastDate?: string
): Promise<CashFlowForecast> {
  const endpoint = forecastDate
    ? `/api/v1/forecast/cash-flow?forecast_date=${encodeURIComponent(
        forecastDate
      )}`
    : "/api/v1/forecast/cash-flow";

  return serverApiClient<CashFlowForecast>(
    endpoint
  );
}
