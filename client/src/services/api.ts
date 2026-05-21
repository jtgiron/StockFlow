const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function transformKeys<T>(obj: unknown, fn: (key: string) => string): T {
  if (Array.isArray(obj))
    return obj.map((item) => transformKeys(item, fn)) as T;
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        fn(k),
        transformKeys(v, fn),
      ]),
    ) as T;
  }
  return obj as T;
}

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

function setToken(token: string | null): void {
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  try {
    // Refresh token is sent automatically via HttpOnly cookie
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!res.ok) {
      setToken(null);
      return false;
    }

    const data = await res.json();
    setToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body:
      body != null
        ? JSON.stringify(transformKeys(body, toSnakeCase))
        : undefined,
  });

  // Auto-refresh on 401 (refresh token is in HttpOnly cookie, sent automatically)
  if (
    res.status === 401 &&
    getToken() &&
    !path.includes("/auth/refresh")
  ) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const refreshed = await refreshPromise;
    if (refreshed) {
      // Retry original request with new token
      const newHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      };
      res = await fetch(`${API_URL}${path}`, {
        method,
        headers: newHeaders,
        credentials: "include",
        body:
          body != null
            ? JSON.stringify(transformKeys(body, toSnakeCase))
            : undefined,
      });
    }
  }

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: "Error de conexión" }));
    const msg = Array.isArray(err.message) ? err.message[0] : err.message;
    throw new ApiError(res.status, msg || `Error ${res.status}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const text = await res.text();
  if (!text) return undefined as T;

  const data = JSON.parse(text);
  return transformKeys<T>(data, toSnakeCase);
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  setToken,
  getToken,
};
