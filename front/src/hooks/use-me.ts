"use client";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "~/lib/api";

/** Rôle renvoyé par `GET /auth/me` (claims JWT). */
export type MeRole = {
  id: string;
  name: string;
  description: string | null;
};

/** Profil renvoyé par `GET /auth/me` (JWT + nom d’organisation résolu côté API). */
export type Me = {
  email: string;
  sub: string;
  organisationId: string;
  role: MeRole;
  organisationName: string;
  firstLogin: boolean;
};

export const meQueryKey = ["auth", "me"] as const;

export async function fetchMe(): Promise<Me | null> {
  try {
    const { data } = await api.get<Me>("/auth/me");
    return data;
  } catch (err) {
    if (
      isAxiosError(err) &&
      (err.response?.status === 401 || err.response?.status === 403)
    ) {
      return null;
    }
    throw err;
  }
}

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    retry: false,
  });
}
