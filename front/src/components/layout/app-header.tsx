"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut } from "lucide-react";

import { UserProfileAvatar } from "~/app/dashboard/utilisateurs/_components/UserProfileAvatar";
import { userDisplayName } from "~/app/dashboard/utilisateurs/_lib/user-display";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { meQueryKey } from "~/hooks/use-me";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserDetailDto } from "~/lib/api-types";

export function AppHeader() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const { data: profile } = useQuery({
    queryKey: ["user", me?.sub] as const,
    queryFn: async () => {
      const { data } = await api.get<UserDetailDto>(`/user/${me!.sub}`);
      return data;
    },
    enabled: Boolean(me?.sub),
    staleTime: 60_000,
  });

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* sortie locale */
    }
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    queryClient.removeQueries({ queryKey: meQueryKey });
    router.replace("/");
  }

  if (!me) return null;

  const displayName = profile
    ? userDisplayName(profile)
    : me.email.split("@")[0] ?? me.email;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 shadow-sm">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Console ERP
        </p>
        <p className="truncate text-sm font-semibold text-foreground">
          {me.organisationName}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="hidden font-normal sm:inline-flex"
        >
          {isMainOrganization(me) ? "Maison mère" : "Filiale"}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-2 px-2 hover:bg-accent"
            >
              <UserProfileAvatar
                email={profile?.email ?? me.email}
                firstName={profile?.firstName}
                lastName={profile?.lastName}
                profilePhotoUrl={profile?.profilePhotoUrl}
                size="md"
                className="size-8 ring-0 ring-offset-0"
              />
              <div className="hidden min-w-0 text-left md:block">
                <p className="truncate text-sm font-medium leading-none">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {me.email}
                </p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium">{me.organisationName}</p>
              <p className="text-xs text-muted-foreground">{me.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void handleLogout()}
            >
              <LogOut className="size-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
