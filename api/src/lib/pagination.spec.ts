import {
  buildPaginationMeta,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginationSkip,
  resolvePagination,
} from './pagination';

describe('pagination', () => {
  it('applique les valeurs par défaut', () => {
    expect(resolvePagination({})).toEqual({ page: 1, limit: DEFAULT_PAGE_SIZE });
  });

  it('plafonne limit à MAX_PAGE_SIZE', () => {
    expect(resolvePagination({ page: 2, limit: 100 })).toEqual({
      page: 2,
      limit: MAX_PAGE_SIZE,
    });
  });

  it('calcule skip et meta', () => {
    expect(paginationSkip(3, 20)).toBe(40);
    expect(buildPaginationMeta(45, 2, 20)).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});
