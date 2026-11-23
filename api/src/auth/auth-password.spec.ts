jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { DUMMY_PASSWORD_HASH, passwordMatches } from './auth-password';

const compare = bcrypt.compare as jest.Mock;

describe('passwordMatches', () => {
  beforeEach(() => {
    compare.mockReset();
  });

  it('compare un hash factice quand aucun mot de passe n’est stocké', async () => {
    compare.mockResolvedValue(false);

    const ok = await passwordMatches('secret', null);

    expect(ok).toBe(false);
    expect(compare).toHaveBeenCalledWith('secret', DUMMY_PASSWORD_HASH);
  });

  it('reste faux si le hash factice correspond, pour ne pas ouvrir de session', async () => {
    compare.mockResolvedValue(true);

    await expect(passwordMatches('secret', undefined)).resolves.toBe(false);
  });

  it('compare le hash stocké et accepte seulement une vraie correspondance', async () => {
    compare.mockResolvedValue(true);

    await expect(passwordMatches('secret', 'stored-hash')).resolves.toBe(true);
    expect(compare).toHaveBeenCalledWith('secret', 'stored-hash');
  });

  it('refuse un hash stocké qui ne correspond pas', async () => {
    compare.mockResolvedValue(false);

    await expect(passwordMatches('secret', 'stored-hash')).resolves.toBe(false);
  });
});
