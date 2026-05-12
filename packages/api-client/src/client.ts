// Refs: SPEC.md §2 Stack, §4 multi-tenant (tenant_id dans chaque requête via JWT)
// Client fetch typé — JWT Bearer + tenant scopé automatiquement via le token

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => string | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const token = config.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      throw new ApiError(res.status, errorBody, `${method} ${path} → ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
    post: <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>("POST", path, body, signal),
    patch: <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>("PATCH", path, body, signal),
    put: <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>("PUT", path, body, signal),
    delete: <T>(path: string, signal?: AbortSignal) => request<T>("DELETE", path, undefined, signal),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
