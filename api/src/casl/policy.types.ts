/** Une règle vérifiée par `PoliciesGuard` via `ability.can(action, subject)`. */
export type PolicyRule = {
  action: string;
  subject: string;
};
