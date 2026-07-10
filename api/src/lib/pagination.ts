/** Taille de page par défaut et plafond pour les listes API. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  items: T[];
  meta: PaginationMeta;
};

export function resolvePagination(input: {
  page?: number;
  limit?: number;
}): PaginationParams {
  const page =
    input.page != null && Number.isFinite(input.page) && input.page >= 1
      ? Math.floor(input.page)
      : 1;
  const rawLimit =
    input.limit != null && Number.isFinite(input.limit) && input.limit >= 1
      ? Math.floor(input.limit)
      : DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, rawLimit);
  return { page, limit };
}

export function paginationSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
