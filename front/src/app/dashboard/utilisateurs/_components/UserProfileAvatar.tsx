"use client";

import { User } from "lucide-react";

import {
  userDisplayName,
  userInitials,
} from "~/app/dashboard/utilisateurs/_lib/user-display";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

type UserProfileAvatarProps = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  size?: "md" | "lg";
  className?: string;
};

export function UserProfileAvatar({
  email,
  firstName,
  lastName,
  profilePhotoUrl,
  size = "lg",
  className,
}: UserProfileAvatarProps) {
  const user = { email, firstName, lastName };
  const initials = userInitials(user);
  const name = userDisplayName(user);
  const photo = profilePhotoUrl?.trim();

  return (
    <Avatar
      className={cn(
        "ring-2 ring-border ring-offset-2 ring-offset-background",
        size === "lg" ? "size-28 md:size-32" : "size-16",
        className,
      )}
    >
      {photo ? (
        <AvatarImage src={photo} alt={`Photo de ${name}`} className="object-cover" />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-primary/10 font-semibold text-primary",
          size === "lg" ? "text-2xl" : "text-base",
        )}
      >
        {initials || <User className="size-8 opacity-60" aria-hidden />}
      </AvatarFallback>
    </Avatar>
  );
}
