import { api } from "~/lib/api";
import type { PaginatedResponseDto } from "~/lib/pagination-types";
import { HR_PAGE_SIZE } from "~/lib/pagination-types";

export type HrListParams = {
  page?: number;
  limit?: number;
  search?: string;
  employeeId?: string;
};

export function hrListQueryParams(
  params: HrListParams = {},
): Record<string, number | string> {
  const out: Record<string, number | string> = {
    page: params.page ?? 1,
    limit: params.limit ?? HR_PAGE_SIZE,
  };
  if (params.search?.trim()) {
    out.search = params.search.trim();
  }
  if (params.employeeId) {
    out.employeeId = params.employeeId;
  }
  return out;
}

export async function fetchHrPage<T>(
  path: string,
  params: HrListParams = {},
): Promise<PaginatedResponseDto<T>> {
  const { data } = await api.get<PaginatedResponseDto<T>>(path, {
    params: hrListQueryParams(params),
  });
  return data;
}

/** Charge toutes les pages (max 20 éléments par requête API) — pour listes déroulantes. */
export async function fetchHrAllItems<T>(
  path: string,
  params: Omit<HrListParams, "page" | "limit"> = {},
): Promise<T[]> {
  const first = await fetchHrPage<T>(path, { ...params, page: 1 });
  const all = [...first.items];
  for (let p = 2; p <= first.meta.totalPages; p++) {
    const next = await fetchHrPage<T>(path, { ...params, page: p });
    all.push(...next.items);
  }
  return all;
}
