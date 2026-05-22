const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

const AUTH_KEY = "tsufarm_auth_token";

export function getToken(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem(AUTH_KEY, token);
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new Event("auth:logout"));
    }
    throw new ApiError(
      res.status,
      data.error ?? `Request failed with status ${res.status}`,
    );
  }

  return data as T;
}
