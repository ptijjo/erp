"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "~/lib/api-client";
import type { MeResponse, OrganisationType } from "~/lib/auth-types";

/** Clé React Query pour invalider le cache après login / logout. */
export const meQueryKey = ["auth", "me"] as const;

function normalizeMe(raw: unknown): MeResponse {
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? r.Id ?? "");
  const emailRaw = r.email ?? r.Email;
  const email = emailRaw == null ? null : String(emailRaw);
  const organisationIdRaw = r.organisationId ?? r.OrganisationId;
  const organisationNameRaw = r.organisationName ?? r.OrganisationName;
  const organisationId =
    organisationIdRaw === null || organisationIdRaw === undefined
      ? null
      : String(organisationIdRaw);
  const organisationName =
    organisationNameRaw === null || organisationNameRaw === undefined
      ? null
      : String(organisationNameRaw);
  const organisationType = parseOrganisationType(
    r.organisationType ?? r.OrganisationType,
  );
  const role = String(r.role ?? r.Role ?? "USER");
  return {
    id,
    email,
    organisationId,
    organisationName,
    organisationType,
    role,
  };
}

function parseOrganisationType(raw: unknown): OrganisationType | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (raw === 0) return "maisonMere";
    if (raw === 1) return "filiale";
    return null;
  }
  const s = String(raw).toLowerCase();
  if (s === "maisonmere" || s === "0") return "maisonMere";
  if (s === "filiale" || s === "1") return "filiale";
  return null;
}

export async function fetchMe(): Promise<MeResponse | null> {
  const res = await apiClient.get<unknown>("/api/Auth/me", {
    validateStatus: (status: number) => status === 200 || status === 401,
  });
  if (res.status === 401) return null;
  if (res.status !== 200) {
    throw new Error(`Impossible de charger le profil (${res.status})`);
  }
  return normalizeMe(res.data);
}

type UseMeOptions = {
  /** Par défaut `true`. Mets `false` pour ne pas lancer la requête (ex. page publique). */
  enabled?: boolean;
};

/**
 * Utilisateur connecté (cache TanStack Query + cookie API .NET).
 * - `data` : profil si session valide, `null` si non authentifié (401)
 * - `isPending` : premier chargement
 */
export function useMe(options?: UseMeOptions) {
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
