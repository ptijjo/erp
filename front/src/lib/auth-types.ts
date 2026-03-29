/** Aligné sur l’enum `OrganisationType` du back (JSON camelCase). */
export type OrganisationType = "maisonMere" | "filiale";

export type MeResponse = {
  id: string;
  email: string | null;
  organisationId: string | null;
  organisationName: string | null;
  organisationType: OrganisationType | null;
  role: string;
};
