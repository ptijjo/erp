import { rlsRequestContext, type RlsRequestStore } from './rls-request-context';
import {
  RLS_QUERY_TX_OPTIONS,
  RLS_SET_CONFIG_SQL,
  prismaDelegateKey,
  rlsSessionParams,
  runModelWithRls,
  wrapRlsTransaction,
  type RlsTx,
} from './rls-session';

const mainStore: RlsRequestStore = {
  organizationId: 'org-1',
  userId: 'user-1',
  isMain: true,
  bypass: false,
};

describe('contexte RLS sur la connexion de la requête', () => {
  it('pose set_config en local (troisième argument true)', () => {
    expect(RLS_SET_CONFIG_SQL.match(/, true\)/g)).toHaveLength(4);
    expect(RLS_SET_CONFIG_SQL).not.toContain('false');
  });

  it('traduit le profil maison mère, filiale et bypass', () => {
    expect(rlsSessionParams(mainStore)).toEqual([
      'org-1',
      'user-1',
      'true',
      '',
    ]);
    expect(
      rlsSessionParams({
        organizationId: 'org-2',
        userId: 'user-2',
        isMain: false,
        bypass: false,
      }),
    ).toEqual(['org-2', 'user-2', 'false', '']);
    expect(
      rlsSessionParams({
        organizationId: null,
        userId: null,
        isMain: false,
        bypass: true,
      }),
    ).toEqual(['', '', 'false', 'on']);
  });

  it('mappe le modèle Prisma vers le délégué client', () => {
    expect(prismaDelegateKey('OrganizationCatalogCategory')).toBe(
      'organizationCatalogCategory',
    );
  });

  it('exécute le modèle dans la transaction qui vient de poser le contexte', async () => {
    const tx = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
      budget: { create: jest.fn().mockResolvedValue({ id: 'b1' }) },
    } as unknown as RlsTx;
    const transaction = jest.fn(
      async (fn: (client: RlsTx) => Promise<unknown>) => fn(tx),
    );

    const result = await rlsRequestContext.run(mainStore, () =>
      runModelWithRls(
        {
          model: 'Budget',
          operation: 'create',
          args: { data: { year: 2026 } },
          query: jest.fn(),
        },
        transaction,
      ),
    );

    expect(result).toEqual({ id: 'b1' });
    expect(transaction).toHaveBeenCalledWith(
      expect.any(Function),
      RLS_QUERY_TX_OPTIONS,
    );
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      RLS_SET_CONFIG_SQL,
      'org-1',
      'user-1',
      'true',
      '',
    );
    expect(tx.budget?.create).toHaveBeenCalledWith({ data: { year: 2026 } });
  });

  it('laisse passer la requête déjà routée vers la transaction en cours', async () => {
    const query = jest.fn().mockResolvedValue('row');
    const transaction = jest.fn();

    const result = await rlsRequestContext.run(
      { ...mainStore, routing: true },
      () =>
        runModelWithRls(
          {
            model: 'Budget',
            operation: 'findMany',
            args: {},
            query,
          },
          transaction,
        ),
    );

    expect(result).toBe('row');
    expect(query).toHaveBeenCalledWith({});
    expect(transaction).not.toHaveBeenCalled();
  });

  it('ne pose pas de contexte hors requête HTTP', async () => {
    const query = jest.fn().mockResolvedValue('row');
    const transaction = jest.fn();

    await runModelWithRls(
      { model: 'User', operation: 'findFirst', args: {}, query },
      transaction,
    );

    expect(query).toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('pose le contexte sur la transaction interactive puis fige le routage', async () => {
    const tx = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
    } as unknown as RlsTx;
    const original = jest.fn(async (fn: (client: RlsTx) => Promise<unknown>) =>
      fn(tx),
    );
    const wrapped = wrapRlsTransaction(original, jest.fn());

    let routingInside = false;
    await rlsRequestContext.run(mainStore, () =>
      wrapped(() => {
        routingInside = getRouting();
        return Promise.resolve('done');
      }),
    );

    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      RLS_SET_CONFIG_SQL,
      'org-1',
      'user-1',
      'true',
      '',
    );
    expect(routingInside).toBe(true);
  });

  it('préfixe un lot Prisma par set_config sur la même transaction', async () => {
    const marker = Promise.resolve({ marker: true });
    const executeRawUnsafe = jest.fn(
      (_sql: string, ..._values: unknown[]): Promise<unknown> => marker,
    );
    const query = { kind: 'deleteMany' };
    const original = jest.fn(
      (_arg: unknown, _options?: unknown): Promise<unknown> =>
        Promise.resolve(undefined),
    );
    const wrapped = wrapRlsTransaction(original, executeRawUnsafe);

    await rlsRequestContext.run(mainStore, () =>
      wrapped([query], { timeout: 1000 }),
    );

    expect(executeRawUnsafe).toHaveBeenCalledWith(
      RLS_SET_CONFIG_SQL,
      'org-1',
      'user-1',
      'true',
      '',
    );
    expect(original).toHaveBeenCalledWith([marker, query], { timeout: 1000 });
  });
});

function getRouting(): boolean {
  return rlsRequestContext.getStore()?.routing === true;
}
