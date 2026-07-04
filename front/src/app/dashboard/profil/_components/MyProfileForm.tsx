"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ProfilePhotoUpload } from "~/app/dashboard/utilisateurs/_components/ProfilePhotoUpload";
import { userDisplayName } from "~/app/dashboard/utilisateurs/_lib/user-display";
import { Button } from "~/components/ui/button";
import { useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type { UserDetailDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

const schema = z.object({
  bio: z
    .string()
    .trim()
    .max(500, { message: "500 caractères maximum" })
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export function MyProfileForm() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user", me?.sub] as const,
    queryFn: async () => {
      const { data } = await api.get<UserDetailDto>(`/user/${me!.sub}`);
      return data;
    },
    enabled: Boolean(me?.sub),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bio: "" },
  });

  useEffect(() => {
    if (!profile) return;
    reset({ bio: profile.bio ?? "" });
  }, [profile, reset]);

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data } = await api.patch<UserDetailDto>("/user/me/profile", {
        bio: values.bio?.trim() ?? "",
      });
      return data;
    },
    onSuccess: async (data) => {
      reset({ bio: data.bio ?? "" });
      await queryClient.invalidateQueries({ queryKey: ["user"] });
      await queryClient.invalidateQueries({ queryKey: ["user", data.id] });
    },
    onError: (err) => {
      alert(apiErrorMessage(err, "Impossible d’enregistrer le profil"));
    },
  });

  if (!me) return null;

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const displayName = userDisplayName(profile);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <ProfilePhotoUpload
          userId={profile.id}
          email={profile.email}
          firstName={profile.firstName}
          lastName={profile.lastName}
          profilePhotoUrl={profile.profilePhotoUrl}
        />
      </div>

      <form
        className="rounded-xl border bg-card p-6 shadow-sm"
        onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
      >
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Mettez à jour votre présentation. Le prénom et le nom ne peuvent être
            modifiés que par l’administration.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <span className="text-sm font-medium">Prénom</span>
            <p className="border-input bg-muted/40 text-muted-foreground h-10 rounded-md border px-3 py-2 text-sm">
              {profile.firstName?.trim() || "—"}
            </p>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Nom</span>
            <p className="border-input bg-muted/40 text-muted-foreground h-10 rounded-md border px-3 py-2 text-sm">
              {profile.lastName?.trim() || "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Quelques mots sur vous…"
            {...register("bio")}
          />
          {errors.bio ? (
            <p className="text-xs text-destructive">{errors.bio.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">500 caractères maximum.</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={!isDirty || saveMutation.isPending}>
            {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
