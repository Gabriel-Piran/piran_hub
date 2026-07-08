const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new ApiError(`Erro ${res.status} ao buscar ${endpoint}`, res.status);
  }

  return (await res.json()) as T;
}

export async function fetchWithFallback<T>(
  endpoint: string,
  fallback: T
): Promise<{ data: T; isMock: boolean }> {
  try {
    const data = await apiFetch<T>(endpoint);
    return { data, isMock: false };
  } catch {
    return { data: fallback, isMock: true };
  }
}
