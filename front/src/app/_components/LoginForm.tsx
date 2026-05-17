"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { dashboardHomePath, fetchMe, meQueryKey } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { apiErrorMessage } from "~/lib/api-error-message";

const schema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

type Schema = z.infer<typeof schema>;

export default function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Schema>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Schema) => {
    try {
      await api.post("/auth/login", {
        email: data.email,
        password: data.password,
      });
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      const profile = await queryClient.fetchQuery({
        queryKey: meQueryKey,
        queryFn: fetchMe,
      });
      router.push(
        profile?.firstLogin
          ? "/dashboard/first-login"
          : profile
            ? dashboardHomePath(profile)
            : "/dashboard",
      );
    } catch (error) {
      setError("root", {
        message: apiErrorMessage(error, "Échec de connexion"),
      });
    }
  };

  return (
    <Card className="border-border/80 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Connexion</CardTitle>
        <CardDescription>Connectez-vous à votre espace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <section className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="nom@entreprise.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.email.message}
              </p>
            ) : null}
          </section>

          <section className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.password.message}
              </p>
            ) : null}
          </section>

          {errors.root ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
