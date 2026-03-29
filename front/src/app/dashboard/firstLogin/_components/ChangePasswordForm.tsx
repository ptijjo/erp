"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";

 const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{9,}$/;
const PASSWORD_MESSAGE =
  "Le mot de passe doit contenir au moins 9 caractères, une majuscule, une minuscule, un chiffre et un symbole";

const schema = z.object({
  newPassword: z
    .string()
    .regex(PASSWORD_REGEX, { message: PASSWORD_MESSAGE }),
  currentPassword: z
    .string()
    .min(1, { message: "Le mot de passe actuel est requis" }),
});

type Schema = z.infer<typeof schema>;

const ChangePasswordForm = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (_data: Schema) => {
    alert(
      "Changement de mot de passe : utiliser l’endpoint Identity .NET (/identity/…) depuis le client.",
    );
    router.push("/dashboard");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-1/3 flex-col items-center justify-center gap-4"
    >
      <h1 className="text-4xl font-extrabold text-orange-500">
        Changer le mot de passe
      </h1>
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="currentPassword">Mot de passe actuel</label>
        <input
          type="password"
          id="currentPassword"
          {...register("currentPassword")}
          className="h-10 w-full rounded border border-gray-300 bg-white px-3 py-2"
          aria-invalid={!!errors.currentPassword}
        />
        {errors.currentPassword && (
          <p className="text-sm text-red-600" role="alert">
            {errors.currentPassword.message}
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="newPassword">Nouveau mot de passe</label>
        <input
          type="password"
          id="newPassword"
          {...register("newPassword")}
          className="h-10 w-full rounded border border-gray-300 bg-white px-3 py-2"
          aria-invalid={!!errors.newPassword}
        />
        {errors.newPassword && (
          <p className="text-sm text-red-600" role="alert">
            {errors.newPassword.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Valider
      </Button>
    </form>
  );
};

export default ChangePasswordForm;
