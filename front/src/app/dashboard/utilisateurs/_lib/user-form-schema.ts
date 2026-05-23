import { z } from "zod";

/** URL de photo de profil (vide = pas de photo / effacement en édition). */
export const profilePhotoUrlField = z
  .string()
  .trim()
  .max(2048, { message: "URL trop longue (2048 caractères max.)" })
  .refine(
    (v) => v === "" || /^https?:\/\/.+/i.test(v),
    { message: "Indiquez une URL absolue commençant par http:// ou https://" },
  );

export const optionalUserNameField = z.string().trim().max(120).optional();
