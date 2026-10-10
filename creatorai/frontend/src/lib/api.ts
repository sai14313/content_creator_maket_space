// Fetch API wrapper for the CreatorAI backend.
import type { AuthResponse } from "./types";

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:8000";

const TOKEN_KEY = "creatorai_token";
const USER_KEY = "creatorai_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: unknown): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail
        .map((d: { msg?: string; loc?: unknown[] }) =>
          d.loc ? `${d.loc.slice(1).join(".")}: ${d.msg}` : d.msg
        )
        .join("; ");
    }
    return res.statusText || `HTTP ${res.status}`;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

const NETWORK_ERROR =
  "Cannot reach the CreatorAI server (network error). " +
  "Check your internet connection. If you run this site, make sure the backend " +
  "is deployed and VITE_API_URL points to it, and that the backend's " +
  "CORS_ORIGINS includes this site's domain.";

/** fetch() that converts network-level failures into a helpful ApiError. */
async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    // fetch() only rejects on network-level failures (offline, DNS, CORS
    // preflight blocked, or mixed-content http on an https page). Surface a
    // clear message instead of the browser's generic "Failed to fetch".
    throw new ApiError(0, NETWORK_ERROR);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  formData?: FormData;
  raw?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await safeFetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.formData
      ? options.formData
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  if (!res.ok) {
    if (res.status === 401 && token) clearSession();
    throw new ApiError(res.status, await parseError(res));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Multipart upload helper (deliverables). */
export async function uploadFile<T>(
  path: string,
  formData: FormData
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await safeFetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  return (await res.json()) as T;
}

/** Absolute URL for a stored deliverable file. */
export function fileUrl(fileName: string): string {
  const token = getToken();
  return `${API_BASE}/api/files/${encodeURIComponent(fileName)}${token ? `?token=${token}` : ""}`;
}

/** Performs a login/register and persists the session. */
export async function authenticate(
  path: "/api/auth/login" | "/api/auth/register",
  body: Record<string, unknown>
): Promise<AuthResponse> {
  const data = await api<AuthResponse>(path, { method: "POST", body });
  setSession(data.access_token, data.user);
  return data;
}
