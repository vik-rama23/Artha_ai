import { serverApiClient } from "./serverClient";

import type { Account } from "./accounts";

export async function getServerAccounts(): Promise<Account[]> {
  return serverApiClient<Account[]>(
    "/api/v1/accounts"
  );
}