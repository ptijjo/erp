"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { fetchMe, meQueryKey } from "~/hooks/use-me";
import { api } from "~/lib/api";

const schema = z.object({
  email: z.string().email({ message: "Email invalide" }),
  password: z.string().min(1, { message: "Le mot de passe est requis" }),
});

type Schema = z.infer<typeof schema>;

function loginErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response) {
    const data = error.response.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object" && "message" in data) {
      const m = (data as { message?: unknown }).message;
      if (typeof m === "string") return m;
    }
    return "Échec de connexion";
  }
  return "Erreur réseau lors de la connexion";
}

const LoginForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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
        profile?.firstLogin ? "/dashboard/first-login" : "/dashboard",
      );
    } catch (error) {
      alert(loginErrorMessage(error));
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-1/3 flex-col items-center justify-center gap-4"
    >
      <div className="w-full">
        <input
          type="email"
          placeholder="Email"
          {...register("email")}
          className="flex h-10 w-full items-center justify-center rounded border border-gray-300 bg-white px-3 py-2"
          aria-invalid={!!errors.email}
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-1 text-center text-lg text-red-600" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="w-full">
        <input
          type="password"
          placeholder="Mot de passe"
          {...register("password")}
          className="flex h-10 w-full items-center justify-center rounded border border-gray-300 bg-white px-3 py-2"
          aria-invalid={!!errors.password}
          autoComplete="current-password"
        />
        {errors.password && (
          <p className="mt-1 text-center text-lg text-red-600" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-10 w-1/2 rounded-md bg-orange-500 text-center text-2xl text-white hover:bg-orange-600"
      >
        {isSubmitting ? "Connexion..." : "Connexion"}
      </Button>
    </form>
  );
};

export default LoginForm;
