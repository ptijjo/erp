"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, Menu, UserRound, Volume2, VolumeX } from "lucide-react";

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
import { MessagesBell } from "~/components/layout/messages-bell";
import { NotificationsBell } from "~/components/layout/notifications-bell";
import { RealtimeBridge } from "~/components/layout/realtime-bridge";
import { useSidebar } from "~/components/layout/sidebar-context";
import { meQueryKey } from "~/hooks/use-me";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserDetailDto } from "~/lib/api-types";
import {
  onSoundPreferenceChanged,
  readSoundEnabled,
  writeSoundEnabled,
} from "~/lib/sound-preferences";

type AppHeaderProps = {
  showMenu?: boolean;
};

export function AppHeader({ showMenu = true }: AppHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { toggleMobile } = useSidebar();
  const [soundEnabled, setSoundEnabled] = useState(() => readSoundEnabled());

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

  useEffect(() => {
    return onSoundPreferenceChanged(setSoundEnabled);
  }, []);

  function toggleSounds() {
    writeSoundEnabled(!soundEnabled);
  }

  if (!me) return null;

  const displayName = profile
    ? userDisplayName(profile)
    : me.email.split("@")[0] ?? me.email;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 shadow-sm sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showMenu ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 lg:hidden"
            onClick={toggleMobile}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
            Console ERP
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {me.organisationName}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <RealtimeBridge />
        <MessagesBell />
        <NotificationsBell />
        <Badge
          variant="secondary"
          className="hidden font-normal sm:inline-flex"
        >
          {isMainOrganization(me) ? "Maison mère" : "Filiale"}
        </Badge>

        <div className="flex items-center">
          <Link
            href="/dashboard/profil"
            className="hover:bg-accent flex h-10 items-center gap-2 rounded-md px-2 transition-colors"
            aria-label="Mon profil"
          >
            <UserProfileAvatar
              email={profile?.email ?? me.email}
              firstName={profile?.firstName}
              lastName={profile?.lastName}
              profilePhotoUrl={profile?.profilePhotoUrl}
              size="md"
              className="size-8 ring-0 ring-offset-0"
            />
            <span className="hidden max-w-[12rem] truncate text-sm font-medium md:inline">
              {displayName}
            </span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                aria-label="Menu compte"
              >
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{me.organisationName}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profil">
                  <UserRound className="size-4" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleSounds}>
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
                {soundEnabled ? "Désactiver les sons" : "Activer les sons"}
              </DropdownMenuItem>
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
      </div>
    </header>
  );
}
