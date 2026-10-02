export async function apiClient<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(
    `/api/backend${endpoint}`,
    {
      ...options,
      cache: "no-store",
      headers: {
        "Content-Type":
          "application/json",
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