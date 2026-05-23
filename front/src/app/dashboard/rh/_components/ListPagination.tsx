"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PaginationMetaDto } from "~/lib/pagination-types";
import { Button } from "~/components/ui/button";

type ListPaginationProps = {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  className?: string;
};

export function ListPagination({
  meta,
  onPageChange,
  className,
}: ListPaginationProps) {
  if (meta.totalPages <= 1) {
    return (
      <p className={className ?? "text-sm text-muted-foreground"}>
        {meta.total === 0
          ? "Aucun résultat"
          : `${meta.total} résultat${meta.total > 1 ? "s" : ""}`}
      </p>
    );
  }

  return (
    <div
      className={
        className ??
        "flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
      }
    >
      <p className="text-sm text-muted-foreground">
        Page {meta.page} / {meta.totalPages} — {meta.total} résultat
        {meta.total > 1 ? "s" : ""}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.page <= 1}
          onClick={() => onPageChange(meta.page - 1)}
        >
          <ChevronLeft className="size-4" />
          Précédent
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={meta.page >= meta.totalPages}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Suivant
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
