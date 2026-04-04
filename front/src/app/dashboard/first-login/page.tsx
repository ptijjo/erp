"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

import { Button } from "~/components/ui/button";
import { fetchMe, meQueryKey } from "~/hooks/use-me";
import { api } from "~/lib/api";

const passwordField = z
  .string()
  .min(9, { message: "Au moins 9 caractères" })
  .regex(/[a-z]/, { message: "Au moins une minuscule" })
  .regex(/[A-Z]/, { message: "Au moins une majuscule" })
  .regex(/[0-9]/, { message: "Au moins un chiffre" })
  .regex(/[^a-zA-Z0-9]/, { message: "Au moins un symbole" });

const schema = z
  .object({
    password: passwordField,
    passwordConfirm: z.string().min(1, { message: "Confirmez le mot de passe" }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas",
    path: ["passwordConfirm"],
  });

type Schema = z.infer<typeof schema>;

function errorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string") return m;
      if (Array.isArray(m)) return m.join(", ");
    }
  }
  return "Impossible d’enregistrer le mot de passe";
}

export default function FirstLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (body: Schema) => {
      await api.post("/auth/first-login/password", {
        password: body.password,
        passwordConfirm: body.passwordConfirm,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: meQueryKey });
      await queryClient.fetchQuery({ queryKey: meQueryKey, queryFn: fetchMe });
      router.replace("/dashboard");
    },
    onError: (err) => {
      setError("root", { message: errorMessage(err) });
    },
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 bg-[#F3F4F6] p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-full bg-orange-500/15 text-orange-600"
            aria-hidden
          >
            <Lock className="size-7" strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-[#2D323E]">
            Définir votre mot de passe
          </h1>
          <p className="text-sm text-gray-600">
            Première connexion : choisissez un mot de passe personnel (minimum 9
            caractères, majuscule, minuscule, chiffre et symbole).
          </p>
        </div>

        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          className="flex flex-col gap-4"
        >
          {errors.root && (
            <p className="text-sm text-red-600" role="alert">
              {errors.root.message}
            </p>
          )}

          <div>
            <label
              htmlFor="first-pw"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Nouveau mot de passe
            </label>
            <input
              id="first-pw"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="first-pw-confirm"
              className="mb-1 block text-sm font-medium text-gray-800"
            >
              Confirmation
            </label>
            <input
              id="first-pw-confirm"
              type="password"
              autoComplete="new-password"
              {...register("passwordConfirm")}
              className="h-11 w-full rounded-lg border border-gray-300 px-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/25"
              aria-invalid={!!errors.passwordConfirm}
            />
            {errors.passwordConfirm && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="h-11 w-full bg-orange-500 font-semibold text-white hover:bg-orange-600"
          >
            {isSubmitting || mutation.isPending
              ? "Enregistrement…"
              : "Valider et accéder au tableau de bord"}
          </Button>
        </form>
      </div>
    </main>
  );
}
