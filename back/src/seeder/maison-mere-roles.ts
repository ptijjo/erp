/** Rôles direction rattachés à l’organisation mère (codes stables + libellés métier). */
export const MAISON_MERE_DIRECTOR_ROLES = [
  { name: 'DIRECTOR_GENERAL', description: 'Directeur général' },
  { name: 'DIRECTOR_OPERATIONS', description: 'Directeur opération' },
  {
    name: 'DIRECTOR_STRATEGY_DEVELOPMENT',
    description: 'Directeur stratégie et développement',
  },
  { name: 'DIRECTOR_FINANCE', description: 'Directeur des finances' },
  {
    name: 'DIRECTOR_LEGAL',
    description: 'Directeur des affaires juridiques',
  },
  {
    name: 'DIRECTOR_TRADITIONAL_SPIRITUAL',
    description: 'Directeur des cultes traditionnels et spirituels',
  },
  {
    name: 'DIRECTOR_ARCHITECTURE_HERITAGE',
    description: "Directrice de l'architecture et du patrimoine",
  },
  {
    name: 'DIRECTOR_MARKETING_COMMUNICATION',
    description:
      'Directrice du marketing, du développement et de la communication',
  },
  { name: 'DIRECTOR_PRODUCTION', description: 'Directeur production' },
] as const;
