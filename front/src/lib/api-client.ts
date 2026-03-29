import axios from "axios";

import { getPublicApiBaseUrl } from "~/lib/api-url";

/** Client HTTP vers l’API ASP.NET (cookies de session). */
export const apiClient = axios.create({
  baseURL: getPublicApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});
