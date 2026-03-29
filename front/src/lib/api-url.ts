/** URL publique de l’API ASP.NET (login, /me, etc.). */
export function getPublicApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:8080";
}
