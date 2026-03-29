"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { ImagePlus } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LOGO_ACCEPT = "image/webp,image/png,image/jpeg";
const LOGO_MIME_TYPES: string[] = ["image/webp", "image/png", "image/jpeg"];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const schema = z.object({
  name: z
    .string()
    .min(1, { message: "Le nom est requis" })
    .max(255, { message: "Le nom ne doit pas dépasser 255 caractères" })
    .trim()
    .toUpperCase(),

  slug: z
    .string()
    .min(1, { message: "Le slug est requis" })
    .max(255, { message: "Le slug ne doit pas dépasser 255 caractères" })
    .trim()
    .toLowerCase(),

  logo: z
    .custom<FileList>()
    .refine((list) => list?.length !== 0, "Le logo est requis")
    .refine(
      (list) => list?.[0] && LOGO_MIME_TYPES.includes(list[0].type),
      "Le fichier doit être en WebP, PNG ou JPG",
    )
    .transform((list) => list!.item(0)!),
});

type Schema = z.infer<typeof schema>;

const AddOrganisationForm = () => {
  const router = useRouter();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<Schema>({
      resolver: zodResolver(schema) as unknown as Resolver<Schema>,
    });

  const nameValue = watch("name");

  useEffect(() => {
    setValue("slug", slugify(nameValue ?? ""));
  }, [nameValue, setValue]);

  const { ref: logoRef, ...logoRegister } = register("logo", {
    onChange: (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      setLogoPreview(file ? URL.createObjectURL(file) : null);
    },
  });

  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    },
    [logoPreview],
  );

  const onSubmit = async (data: Schema) => {
    setIsPending(true);
    try {
      await fileToDataUrl(data.logo);
      alert(
        "Formulaire prêt. Branchez POST vers l'API .NET pour créer l'organisation.",
      );
      router.push("/dashboard/organisations");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-1 max-w-md flex-col items-center justify-center gap-4"
    >
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="name">Nom</label>
        <input
          id="name"
          {...register("name")}
          className="h-10 w-full rounded border border-gray-300 bg-white px-3 py-2"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="text-sm text-red-600" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="flex w-full flex-col gap-1">
        <label htmlFor="slug">Slug</label>
        <input
          id="slug"
          {...register("slug")}
          className="h-10 w-full rounded border border-gray-300 bg-white px-3 py-2"
          aria-invalid={!!errors.slug}
        />
        {errors.slug && (
          <p className="text-sm text-red-600" role="alert">
            {errors.slug.message}
          </p>
        )}
      </div>
      <div className="flex w-full flex-col items-center gap-1">
        <label
          htmlFor="logo"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-orange-400 hover:bg-orange-50/50 focus-within:ring-2 focus-within:ring-orange-500 focus-within:ring-offset-2 aria-invalid:border-red-500"
          aria-invalid={!!errors.logo}
        >
          <input
            id="logo"
            type="file"
            accept={LOGO_ACCEPT}
            {...logoRegister}
            ref={logoRef}
            className="sr-only"
            aria-invalid={!!errors.logo}
          />
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Aperçu du logo"
              className="size-24 rounded-lg border border-gray-200 object-contain bg-gray-50"
            />
          ) : (
            <span className="text-gray-400" aria-hidden>
              <ImagePlus className="size-12" />
            </span>
          )}
        </label>
        {errors.logo && (
          <p className="text-center text-sm text-red-600" role="alert">
            {errors.logo.message}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-md bg-orange-500 px-4 py-2 text-white disabled:opacity-50"
      >
        {isPending ? "Création…" : "Ajouter"}
      </button>
    </form>
  );
};

export default AddOrganisationForm;
