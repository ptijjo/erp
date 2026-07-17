/** Codes des pôles seedés VIFAA — non supprimables ; code non modifiable. */
export const SYSTEM_POLE_CODES = new Set([
  "Pole_OPERATIONS",
  "Pole_STRATEGY_DEVELOPMENT",
  "Pole_FINANCE",
  "Pole_LEGAL",
  "Pole_ARCHITECTURE_HERITAGE",
  "Pole_MARKETING_COMMUNICATION",
  "Pole_PRODUCTION",
  "Pole_HR",
]);

export function isSystemPoleCode(code: string): boolean {
  return SYSTEM_POLE_CODES.has(code);
}
