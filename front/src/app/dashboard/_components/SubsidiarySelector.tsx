"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { OrganizationDto } from "~/lib/api-types";
import { useSubsidiaryContext } from "~/providers/subsidiary-context";

const ALL_VALUE = "__all__";

export function SubsidiarySelector() {
  const { data: me } = useMe();
  const { selectedSubsidiaryId, setSelectedSubsidiaryId } =
    useSubsidiaryContext();

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: me != null && isMainOrganization(me),
  });

  const subsidiaries = useMemo(
    () => organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  if (!me || !isMainOrganization(me) || subsidiaries.length === 0) {
    return null;
  }

  const value = selectedSubsidiaryId ?? ALL_VALUE;

  return (
    <div className="hidden items-center gap-2 sm:flex">
      <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <Label htmlFor="subsidiary-selector" className="sr-only">
        Filiale
      </Label>
      <Select
        value={value}
        onValueChange={(v) =>
          setSelectedSubsidiaryId(v === ALL_VALUE ? null : v)
        }
      >
        <SelectTrigger id="subsidiary-selector" className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Toutes les filiales" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>Maison mère (vue globale)</SelectItem>
          {subsidiaries.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
