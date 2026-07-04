"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { api } from "~/lib/api";
import type { OrganizationDto } from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { cn } from "~/lib/utils";

const editSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Le nom est requis" })
    .max(255, { message: "Le nom ne doit pas dépasser 255 caractères" })
    .trim(),
  description: z.string().max(2000).optional(),
});

type EditSchema = z.infer<typeof editSchema>;

function organizationTypeLabel(type: string): string {
  switch (type) {
    case "MAIN":
      return "Maison mère";
    case "SUBSIDIARY":
      return "Filiale";
    default:
      return type;
  }
}

function organizationTypeBadgeClass(type: string): string {
  switch (type) {
    case "MAIN":
      return "bg-sidebar text-white hover:bg-sidebar";
    case "SUBSIDIARY":
      return "bg-orange-100 font-normal text-orange-950 hover:bg-orange-100";
    default:
      return "";
  }
}

type DetailFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

function DetailField({ label, children, className }: DetailFieldProps) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

type OrganisationDetailOverviewProps = {
  org: OrganizationDto;
  canEdit: boolean;
};

export function OrganisationDetailOverview({
  org,
  canEdit,
}: OrganisationDetailOverviewProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const description = org.description?.trim();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditSchema>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: org.name,
      description: org.description ?? "",
    },
  });

  useEffect(() => {
    reset({
      name: org.name,
      description: org.description ?? "",
    });
  }, [org.id, org.name, org.description, reset]);

  const updateMutation = useMutation({
    mutationFn: async (body: EditSchema) => {
      const trimmedDescription = body.description?.trim() ?? "";
      const { data } = await api.patch<OrganizationDto>(
        `/organisation/${org.id}`,
        {
          name: body.name.trim(),
          description: trimmedDescription.length > 0 ? trimmedDescription : "",
        },
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["organisation"] });
      setEditing(false);
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateMutation.mutate(values);
  });

  const cancelEdit = () => {
    reset({
      name: org.name,
      description: org.description ?? "",
    });
    updateMutation.reset();
    setEditing(false);
  };

  return (
    <Card className="w-full gap-0 py-0">
      <CardHeader className="border-b px-6 py-5">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-sidebar text-white">
            <Building2 className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{org.name}</h2>
              <Badge
                className={cn(
                  "font-normal",
                  organizationTypeBadgeClass(org.organizationType),
                )}
              >
                {organizationTypeLabel(org.organizationType)}
              </Badge>
            </div>
          </div>
          {canEdit && !editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" />
              Modifier
            </Button>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="px-6 py-5">
        {editing ? (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="org-edit-name">Nom</Label>
              <Input
                id="org-edit-name"
                {...register("name")}
                aria-invalid={!!errors.name}
                autoComplete="organization"
              />
              {errors.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-edit-description">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (facultatif)
                </span>
              </Label>
              <textarea
                id="org-edit-description"
                rows={4}
                {...register("description")}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[100px] w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-invalid={!!errors.description}
              />
              {errors.description ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.description.message}
                </p>
              ) : null}
            </div>

            {updateMutation.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {apiErrorMessage(
                  updateMutation.error,
                  "Impossible de mettre à jour l’organisation.",
                )}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={cancelEdit}
              >
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <>
            <dl className="grid gap-5">
              <DetailField label="Description" className="sm:col-span-2">
                {description ? (
                  <span className="font-normal whitespace-pre-wrap">
                    {description}
                  </span>
                ) : (
                  <span className="font-normal text-muted-foreground italic">
                    Aucune description renseignée.
                  </span>
                )}
              </DetailField>
            </dl>

            <Separator className="my-5" />

            <dl className="grid gap-5 sm:grid-cols-2">
              <DetailField label="Identifiant court (slug)">
                <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">
                  {org.slug}
                </code>
              </DetailField>
              <DetailField label="Type">
                {organizationTypeLabel(org.organizationType)}
              </DetailField>
            </dl>

            <Separator className="my-5" />

            <DetailField label="Identifiant technique">
              <code className="block break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                {org.id}
              </code>
            </DetailField>
          </>
        )}
      </CardContent>
    </Card>
  );
}
