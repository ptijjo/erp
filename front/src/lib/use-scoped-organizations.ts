"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { isMainOrganization, useMe } from "~/hooks/use-me";
import { fetchOrganizations } from "~/lib/api-list";

/** Organisations visibles pour les formulaires multi-tenant (maison mère + filiales). */
export function useScopedOrganizations(enabled = true) {
  const { data: me } = useMe();
  const main = me != null && isMainOrganization(me);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: fetchOrganizations,
    enabled: Boolean(enabled && main),
  });

  const subsidiaries = useMemo(
    () => organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  const selectableOrgs = useMemo(() => {
    if (!main) return [];
    return organizations;
  }, [main, organizations]);

  const defaultOrganizationId = main
    ? (me?.organisationId ?? organizations[0]?.id ?? "")
    : (me?.organisationId ?? "");

  return {
    me,
    main,
    organizations,
    subsidiaries,
    selectableOrgs,
    defaultOrganizationId,
    isLoading: main && isLoading,
  };
}
