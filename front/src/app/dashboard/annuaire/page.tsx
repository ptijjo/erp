"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { TableScroll } from "~/components/layout/table-scroll";
import { Badge } from "~/components/ui/badge";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { DirectoryEntryDto } from "~/lib/api-types";

function directoryDisplayName(entry: DirectoryEntryDto): string {
  return `${entry.firstName} ${entry.lastName}`.trim();
}

const SEARCH_DEBOUNCE_MS = 300;

export default function AnnuairePage() {
  const { data: me, isPending: mePending } = useMe();
  const canRead = me != null && hasMePermission(me, "read", "User");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data: entries = [], isFetching } = useQuery({
    queryKey: ["directory", "search", debouncedSearch] as const,
    queryFn: async () => {
      const { data } = await api.get<DirectoryEntryDto[]>("/directory/search", {
        params: { q: debouncedSearch, limit: 50 },
      });
      return data;
    },
    enabled: canRead && debouncedSearch.length >= 2,
    placeholderData: (previous) => previous,
  });

  const showResults = debouncedSearch.length >= 2;
  const showLoading = showResults && isFetching && entries.length === 0;

  return (
    <PageShell>
      <PageHeader
        title="Annuaire"
        description="Collaborateurs actifs : nom, rôle applicatif, poste et département."
      />

      {!mePending && !canRead ? (
        <p className="text-sm text-muted-foreground">
          Vous n’avez pas les droits pour consulter l’annuaire.
        </p>
      ) : (
        <>
          <div className="relative mb-6 max-w-xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, rôle, poste ou département…"
              className="h-11 w-full rounded-xl border border-input bg-background pl-11 pr-4 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              aria-label="Rechercher dans l’annuaire"
            />
          </div>

          {!showResults ? (
            <p className="text-sm text-muted-foreground">
              Saisissez au moins 2 caractères pour filtrer l’annuaire.
            </p>
          ) : showLoading ? (
            <p className="text-sm text-muted-foreground">Recherche…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun collaborateur actif trouvé.
            </p>
          ) : (
            <>
              {isFetching ? (
                <p className="mb-2 text-xs text-muted-foreground">Mise à jour…</p>
              ) : null}
              <TableScroll>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 font-semibold">Nom</th>
                      <th className="px-4 py-3 font-semibold">Organisation</th>
                      <th className="px-4 py-3 font-semibold">Rôle</th>
                      <th className="px-4 py-3 font-semibold">Poste</th>
                      <th className="px-4 py-3 font-semibold">Département</th>
                      <th className="px-4 py-3 font-semibold">Compte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr
                        key={entry.employeeId ?? entry.userId ?? entry.email}
                        className="border-b border-border/60"
                      >
                        <td className="px-4 py-3 font-medium">
                          {directoryDisplayName(entry)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.organization.name}
                        </td>
                        <td className="px-4 py-3">
                          {entry.role ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {entry.role.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.position ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.department?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {entry.userId ? (
                            <Link
                              href={`/dashboard/utilisateurs/${entry.userId}`}
                              className="text-primary underline-offset-2 hover:underline"
                            >
                              {entry.email ?? "Voir le compte"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
