import { serverApiClient } from "./serverClient";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  currency: string;
  timezone: string;
};

export async function getCurrentUser(): Promise<AuthUser> {
  return serverApiClient<AuthUser>(
    "/api/v1/auth/me"
  );
}