import * as bcrypt from 'bcrypt';

/**
 * Hash bcrypt (coût 12) d’un secret qui n’est le mot de passe d’aucun compte.
 * `bcrypt.compare` tourne aussi quand l’email est inconnu, pour que la réponse
 * ne révèle pas si le compte existe.
 */
export const DUMMY_PASSWORD_HASH =
  '$2b$12$VAnvWX1rBvvv39jHLDlx9.cccM6bShH7rZY4V97qAGB.87aaXQKgG';

export async function passwordMatches(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  const hash =
    typeof storedHash === 'string' && storedHash.length > 0
      ? storedHash
      : DUMMY_PASSWORD_HASH;
  const matches = await bcrypt.compare(password, hash);
  return matches && hash !== DUMMY_PASSWORD_HASH;
}
