import axios from "axios";

export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BASE_URL;
  if (!url?.trim()) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not set");
  }
  return url.replace(/\/$/, "");
}

/** Client Axios : base URL + cookies httpOnly (`token`) pour le JWT Nest. */
export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: { Accept: "application/json" },
});
