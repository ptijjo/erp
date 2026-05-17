"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
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

const AVATAR_URL =
  "https://vibz.s3.eu-central-1.amazonaws.com/logo/photoProfil.png";

export function AppHeader() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();

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

  const initials =
    me.email?.slice(0, 2).toUpperCase() ??
    me.organisationName.slice(0, 2).toUpperCase();

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
              <Avatar className="size-8">
                <AvatarImage src={AVATAR_URL} alt="" />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden min-w-0 text-left md:block">
                <p className="truncate text-sm font-medium leading-none">
                  {me.email.split("@")[0]}
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
