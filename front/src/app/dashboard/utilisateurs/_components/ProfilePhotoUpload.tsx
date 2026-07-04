"use client";

import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Trash2 } from "lucide-react";

import { UserProfileAvatar } from "~/app/dashboard/utilisateurs/_components/UserProfileAvatar";
import { Button } from "~/components/ui/button";
import { meQueryKey } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserDetailDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

type ProfilePhotoUploadProps = {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePhotoUrl?: string | null;
  /** Modération admin sur le profil d’un autre utilisateur. */
  moderation?: boolean;
  onUpdated?: (profilePhotoUrl: string | null) => void;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

export function ProfilePhotoUpload({
  userId,
  email,
  firstName,
  lastName,
  profilePhotoUrl,
  moderation = false,
  onUpdated,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayPhoto = previewUrl ?? profilePhotoUrl?.trim() ?? null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user"] });
    await queryClient.invalidateQueries({ queryKey: ["user", userId] });
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("photo", file);
      const { data } = await api.post<UserDetailDto>(
        `/user/${userId}/profile-photo`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    },
    onSuccess: async (data) => {
      setPreviewUrl(null);
      onUpdated?.(data.profilePhotoUrl ?? null);
      await invalidate();
    },
    onError: (err) => {
      setPreviewUrl(null);
      alert(apiErrorMessage(err, "Impossible d’envoyer la photo"));
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<UserDetailDto>(
        `/user/${userId}/profile-photo`,
      );
      return data;
    },
    onSuccess: async (data) => {
      setPreviewUrl(null);
      onUpdated?.(data.profilePhotoUrl ?? null);
      await invalidate();
    },
    onError: (err) => {
      alert(apiErrorMessage(err, "Impossible de supprimer la photo"));
    },
  });

  const busy = uploadMutation.isPending || removeMutation.isPending;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image trop volumineuse (5 Mo maximum).");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    uploadMutation.mutate(file);
  }

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      <div className="relative">
        <UserProfileAvatar
          email={email}
          firstName={firstName}
          lastName={lastName}
          profilePhotoUrl={displayPhoto}
          size="lg"
        />
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <Loader2 className="text-primary size-8 animate-spin" />
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Photo de profil</p>
        <p className="text-muted-foreground max-w-sm text-xs">
          {moderation
            ? "Modération : remplacez ou supprimez la photo de cet utilisateur (ex. contenu inapproprié)."
            : "JPEG, PNG, WebP ou GIF — redimensionnée en 512×512 et convertie en WebP avant envoi sur Cloudflare R2."}
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={handleFileChange}
            disabled={busy}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="mr-1.5 size-4" />
            Changer la photo
          </Button>
          {displayPhoto ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => {
                const msg = moderation
                  ? "Supprimer la photo de profil de cet utilisateur ?"
                  : "Supprimer la photo de profil ?";
                if (window.confirm(msg)) {
                  removeMutation.mutate();
                }
              }}
            >
              <Trash2 className="mr-1.5 size-4" />
              Supprimer
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
