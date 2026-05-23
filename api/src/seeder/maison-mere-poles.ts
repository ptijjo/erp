/** Pôles maison mère VIFAA (codes stables alignés sur `02-objectif.mdc`). */
export const MAISON_MERE_POLES = [
  {
    code: 'Pole_OPERATIONS',
    name: 'Pôle opérations',
    description: 'Gestion de toutes les opérations de la société',
    directorRoleName: 'DIRECTOR_OPERATIONS',
  },
  {
    code: 'Pole_STRATEGY_DEVELOPMENT',
    name: 'Pôle stratégie et développement',
    description: 'Gestion stratégie et développement',
    directorRoleName: 'DIRECTOR_STRATEGY_DEVELOPMENT',
  },
  {
    code: 'Pole_FINANCE',
    name: 'Pôle finances',
    description: 'Gestion des finances',
    directorRoleName: 'DIRECTOR_FINANCE',
  },
  {
    code: 'Pole_LEGAL',
    name: 'Pôle affaires juridiques',
    description: 'Gestion des affaires juridiques',
    directorRoleName: 'DIRECTOR_LEGAL',
  },
  {
    code: 'Pole_TRADITIONAL_SPIRITUAL',
    name: 'Pôle cultes traditionnels et spirituels',
    description: 'Gestion des cultes traditionnels et spirituels',
    directorRoleName: 'DIRECTOR_TRADITIONAL_SPIRITUAL',
  },
  {
    code: 'Pole_ARCHITECTURE_HERITAGE',
    name: "Pôle architecture et patrimoine",
    description: "Gestion de l'architecture et du patrimoine",
    directorRoleName: 'DIRECTOR_ARCHITECTURE_HERITAGE',
  },
  {
    code: 'Pole_MARKETING_COMMUNICATION',
    name: 'Pôle marketing et communication',
    description:
      'Gestion du marketing, du développement et de la communication',
    directorRoleName: 'DIRECTOR_MARKETING_COMMUNICATION',
  },
  {
    code: 'Pole_PRODUCTION',
    name: 'Pôle production',
    description: 'Gestion production',
    directorRoleName: 'DIRECTOR_PRODUCTION',
  },
  {
    code: 'Pole_HR',
    name: 'Pôle ressources humaines',
    description: 'Gestion des employés, contrats, congés et rémunérations',
    directorRoleName: 'DIRECTOR_HR',
  },
] as const;
