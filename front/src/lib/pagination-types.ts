/** Réponse paginée des listes API (ex. modules RH). */
export type PaginationMetaDto = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponseDto<T> = {
  items: T[];
  meta: PaginationMetaDto;
};

export const HR_PAGE_SIZE = 20;
