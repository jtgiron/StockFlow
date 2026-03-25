const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
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

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body:
      body != null
        ? JSON.stringify(transformKeys(body, toCamelCase))
        : undefined,
  });

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
