import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL;
  if (!url?.trim()) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  }
  return url.replace(/\/$/, "");
}

/** Client Axios : cookies httpOnly (`token` + `refresh_token`) pour la session Nest. */
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: { Accept: "application/json" },
});

let refreshSessionPromise: Promise<void> | null = null;

function runRefreshSession(): Promise<void> {
  if (!refreshSessionPromise) {
    refreshSessionPromise = api
      .post("/auth/refresh", null, { skipAuthRefresh: true })
      .then(() => undefined)
      .finally(() => {
        refreshSessionPromise = null;
      });
  }
  return refreshSessionPromise;
}

/** Refresh mutualisé (interceptor 401 + keep-alive). */
export function refreshSession(): Promise<void> {
  return runRefreshSession();
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    if (!original) {
      throw error;
    }
    if (original.skipAuthRefresh) {
      throw error;
    }
    if (error.response?.status !== 401) {
      throw error;
    }
    const url = original.url ?? "";
    if (
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/logout")
    ) {
      throw error;
    }
    if (original._retry) {
      throw error;
    }
    try {
      await runRefreshSession();
      original._retry = true;
      return api.request(original);
    } catch {
      throw error;
    }
  },
);
