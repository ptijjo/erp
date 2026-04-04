"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { meQueryKey } from "~/hooks/use-me";
import { api } from "~/lib/api";

type NavHeaderProps = {
  imageUrl: string;
  organization: string;
  displayName?: string;
};

export default function NavHeader({
  imageUrl,
  organization,
  displayName,
}: NavHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* on force quand même la sortie locale */
    }
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    queryClient.removeQueries({ queryKey: meQueryKey });
    router.replace("/");
  }

  const fallback =
    displayName?.slice(0, 2).toUpperCase() ??
    imageUrl.split("/").pop()?.split(".")[0]?.slice(0, 2).toUpperCase() ??
    "?";

  return (
    <nav className="flex items-center gap-3">
      <div className="text-right text-sm leading-tight">
        <p className="font-medium text-white">{organization}</p>
        {displayName && (
          <p className="text-xs text-gray-300">{displayName}</p>
        )}
      </div>
      <Avatar>
        <AvatarImage src={imageUrl} alt="" />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        <LogOut className="size-4 shrink-0" strokeWidth={2} />
        Déconnexion
      </button>
    </nav>
  );
}
