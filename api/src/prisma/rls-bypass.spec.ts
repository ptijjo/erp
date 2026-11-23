import { getRlsRequestStore, rlsRequestContext } from './rls-request-context';
import { withRlsBypass } from './rls-bypass';

describe('withRlsBypass', () => {
  it('exécute le travail avec bypass, y compris après un await', async () => {
    let seen = false;

    await withRlsBypass(async () => {
      await Promise.resolve();
      seen = getRlsRequestStore()?.bypass === true;
    });

    expect(seen).toBe(true);
    expect(getRlsRequestStore()).toBeUndefined();
  });

  it('couvre le contexte HTTP le temps du cron ou du seed', async () => {
    await rlsRequestContext.run(
      {
        organizationId: 'org-1',
        userId: 'user-1',
        isMain: false,
        bypass: false,
      },
      async () => {
        await withRlsBypass(() => {
          expect(getRlsRequestStore()).toMatchObject({
            organizationId: 'org-1',
            userId: 'user-1',
            bypass: true,
          });
          return Promise.resolve();
        });
        expect(getRlsRequestStore()?.bypass).toBe(false);
      },
    );
  });
});
