import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const APP_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export async function serverApiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(
      "artha_access_token"
    )?.value;

  if (!accessToken) {
    redirect("/login");
  }

  const response = await fetch(
    `${APP_BASE_URL}/api/backend${endpoint}`,
    {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type":
          "application/json",
        Cookie: `artha_access_token=${accessToken}`,
        ...(options?.headers ?? {}),
      },
    }
  );

  if (!response.ok) {
    const message =
      await response.text();

    let errorMessage = message;

    try {
      const parsed =
        JSON.parse(message);

      if (
        typeof parsed?.detail ===
        "string"
      ) {
        errorMessage =
          parsed.detail;
      }
    } catch {
      // Response was not JSON.
    }

    if (response.status === 401) {
      redirect("/login");
    }

    throw new Error(
      errorMessage ||
        `API request failed with status ${response.status}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}