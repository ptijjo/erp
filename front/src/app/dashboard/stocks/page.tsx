"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ClipboardList,
  Layers,
  Package,
  Pencil,
  Search,
} from "lucide-react";

import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  OrganizationDto,
  PaginatedResponse,
  ProductDto,
  StockDto,
  StockOrderDto,
  SupplierDto,
} from "~/lib/api-types";
import { extractApiList, FULL_LIST_QUERY } from "~/lib/api-list";
import type { Me } from "~/hooks/use-me";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";

import { apiErrorMessage } from "~/lib/api-error-message";
import { TableScroll } from "~/components/layout/table-scroll";
import {
  StockOrderBudgetBadge,
  StockOrderBudgetConfirmHint,
} from "~/app/dashboard/stocks/_components/StockOrderBudgetBadge";
import { StockOrderRequesterCell } from "~/app/dashboard/stocks/_components/StockOrderRequesterCell";

const ORANGE = "#FF8C00";

function suppliersForProduct(product: ProductDto): SupplierDto[] {
  return product.productSuppliers?.map((ps) => ps.supplier) ?? [];
}

/** Ligne affichée pour une filiale : produit du catalogue + stock réel ou quantités à 0. */
type SubsidiaryStockDisplayRow = {
  rowKey: string;
  stock: StockDto | null;
  product: ProductDto;
  organizationLabel: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
};

function buildSubsidiaryRows(
  me: Me,
  stocks: StockDto[],
  catalogProducts: ProductDto[],
  canReadCatalog: boolean,
): SubsidiaryStockDisplayRow[] {
  const stockByProductId = new Map(
    stocks.map((s) => [s.productId, s] as const),
  );

  if (!canReadCatalog) {
    return stocks
      .map((s) => ({
        rowKey: s.id,
        stock: s,
        product: s.product,
        organizationLabel: me.organisationName,
        quantity: s.quantity,
        minQuantity: s.minQuantity,
        maxQuantity: s.maxQuantity,
      }))
      .sort((a, b) => a.product.name.localeCompare(b.product.name, "fr"));
  }

  return catalogProducts
    .map((p) => {
      const st = stockByProductId.get(p.id);
      return {
        rowKey: st?.id ?? `virtual-${p.id}`,
        stock: st ?? null,
        product: p,
        organizationLabel: me.organisationName,
        quantity: st?.quantity ?? 0,
        minQuantity: st?.minQuantity ?? 0,
        maxQuantity: st?.maxQuantity ?? null,
      };
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "fr"));
}

type EditingStockState =
  | { kind: "patch"; stock: StockDto }
  | { kind: "upsert"; product: ProductDto };

const ALL_SUBSIDIARIES = "all";

const STATUS_LABEL: Record<StockOrderDto["status"], string> = {
  PENDING: "En attente",
  CONFIRMED: "Réception confirmée",
  CANCELLED: "Annulée",
};

export default function StocksPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const isMain = me != null && isMainOrganization(me);
  const canUpdateStock = me != null && hasMePermission(me, "update", "Stock");
  const canReadOrders =
    me != null && hasMePermission(me, "read", "StockOrder");
  const canCreateOrder =
    me != null &&
    !isMainOrganization(me) &&
    hasMePermission(me, "create", "StockOrder");
  const canUpdateOrder =
    me != null && hasMePermission(me, "update", "StockOrder");
  const canReadCatalog =
    me != null && hasMePermission(me, "read", "Product");
  const canReadStock = me != null && hasMePermission(me, "read", "Stock");

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EditingStockState | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editMin, setEditMin] = useState("");
  const [editMax, setEditMax] = useState("");

  const [orderModal, setOrderModal] = useState<{
    productId: string;
    productName: string;
    suppliers: SupplierDto[];
  } | null>(null);
  const [orderSupplierId, setOrderSupplierId] = useState("");
  const [orderQty, setOrderQty] = useState("1");
  const [orderNote, setOrderNote] = useState("");
  const [orderSubsidiaryFilter, setOrderSubsidiaryFilter] =
    useState(ALL_SUBSIDIARIES);

  const { data: stocks = [], isLoading, isError } = useQuery({
    queryKey: ["stock"] as const,
    queryFn: async () => {
      const { data } = await api.get<StockDto[] | PaginatedResponse<StockDto>>(
        "/stock",
        FULL_LIST_QUERY,
      );
      return extractApiList(data);
    },
    enabled: !mePending && canReadStock,
  });

  const {
    data: catalogProducts = [],
    isLoading: catalogLoading,
  } = useQuery({
    queryKey: ["product"] as const,
    queryFn: async () => {
      const { data } = await api.get<ProductDto[] | PaginatedResponse<ProductDto>>(
        "/product",
        FULL_LIST_QUERY,
      );
      return extractApiList(data);
    },
    enabled: Boolean(me && !isMain && canReadCatalog),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: Boolean(me && isMain && canReadOrders),
  });

  const orderSubsidiaries = useMemo(
    () =>
      organizations.filter((o) => o.organizationType === "SUBSIDIARY"),
    [organizations],
  );

  const orderSubsidiaryFilterId =
    orderSubsidiaryFilter !== ALL_SUBSIDIARIES
      ? orderSubsidiaryFilter
      : undefined;

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["stock-order", orderSubsidiaryFilterId] as const,
    queryFn: async () => {
      const { data } = await api.get<StockOrderDto[]>("/stock-order", {
        params: orderSubsidiaryFilterId
          ? { subsidiaryOrganizationId: orderSubsidiaryFilterId }
          : undefined,
      });
      return data;
    },
    enabled: canReadOrders,
  });

  const mainFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stocks;
    return stocks.filter(
      (s) =>
        s.product.name.toLowerCase().includes(q) ||
        s.organization.name.toLowerCase().includes(q) ||
        s.organization.slug.toLowerCase().includes(q),
    );
  }, [stocks, search]);

  const subsidiaryRows = useMemo(() => {
    if (!me || isMain) return [];
    return buildSubsidiaryRows(me, stocks, catalogProducts, canReadCatalog);
  }, [me, isMain, stocks, catalogProducts, canReadCatalog]);

  const subsidiaryFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subsidiaryRows;
    return subsidiaryRows.filter(
      (r) =>
        r.product.name.toLowerCase().includes(q) ||
        r.organizationLabel.toLowerCase().includes(q),
    );
  }, [subsidiaryRows, search]);

  const lowStockRowKeysMain = useMemo(() => {
    const set = new Set<string>();
    for (const s of mainFiltered) {
      if (s.quantity <= s.minQuantity) set.add(s.id);
    }
    return set;
  }, [mainFiltered]);

  const lowStockRowKeysSub = useMemo(() => {
    const set = new Set<string>();
    for (const r of subsidiaryFiltered) {
      if (r.quantity <= r.minQuantity) set.add(r.rowKey);
    }
    return set;
  }, [subsidiaryFiltered]);

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      quantity,
      minQuantity,
      maxQuantity,
    }: {
      id: string;
      quantity: number;
      minQuantity: number;
      maxQuantity: number | null;
    }) => {
      await api.patch(`/stock/${id}`, {
        quantity,
        minQuantity,
        maxQuantity,
      });
    },
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de mettre à jour le stock"));
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async ({
      organizationId,
      productId,
      quantity,
      minQuantity,
      maxQuantity,
    }: {
      organizationId: string;
      productId: string;
      quantity: number;
      minQuantity: number;
      maxQuantity: number | null;
    }) => {
      await api.post("/stock/upsert", {
        organizationId,
        productId,
        quantity,
        minQuantity,
        maxQuantity,
      });
    },
    onSuccess: async () => {
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible d’enregistrer le stock"));
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (body: {
      productId: string;
      supplierId: string;
      quantity: number;
      note?: string;
    }) => {
      await api.post("/stock-order", body);
    },
    onSuccess: async () => {
      setOrderModal(null);
      setOrderSupplierId("");
      setOrderQty("1");
      setOrderNote("");
      await queryClient.invalidateQueries({ queryKey: ["stock-order"] });
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de créer la commande"));
    },
  });

  const orderStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: StockOrderDto["status"];
    }) => {
      const { data } = await api.patch<StockOrderDto>(
        `/stock-order/${id}/status`,
        { status },
      );
      return data;
    },
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["stock-order"] });
      await queryClient.invalidateQueries({ queryKey: ["stock"] });
      if (
        variables.status === "CONFIRMED" &&
        data.budgetLink &&
        !data.budgetLink.linked
      ) {
        alert(
          `Réception enregistrée, mais non imputée au budget : ${data.budgetLink.reason ?? "vérifiez le budget du mois (ligne STOCK)."}`,
        );
      }
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de mettre à jour la commande"));
    },
  });

  function openEditMain(s: StockDto) {
    if (!canUpdateStock) return;
    setEditing({ kind: "patch", stock: s });
    setEditQuantity(String(s.quantity));
    setEditMin(String(s.minQuantity));
    setEditMax(s.maxQuantity != null ? String(s.maxQuantity) : "");
  }

  function openEditSubsidiary(row: SubsidiaryStockDisplayRow) {
    if (!canUpdateStock) return;
    if (row.stock) {
      setEditing({ kind: "patch", stock: row.stock });
    } else {
      setEditing({ kind: "upsert", product: row.product });
    }
    setEditQuantity(String(row.quantity));
    setEditMin(String(row.minQuantity));
    setEditMax(row.maxQuantity != null ? String(row.maxQuantity) : "");
  }

  function submitEdit() {
    if (!editing || !me) return;
    const q = Number(editQuantity);
    const mn = Number(editMin);
    const mxRaw = editMax.trim();
    const mx = mxRaw === "" ? null : Number(mxRaw);
    if (!Number.isInteger(q) || q < 0) {
      alert("Quantité invalide");
      return;
    }
    if (!Number.isInteger(mn) || mn < 0) {
      alert("Seuil min invalide");
      return;
    }
    if (mx !== null && (!Number.isInteger(mx) || mx < 0)) {
      alert("Seuil max invalide");
      return;
    }
    if (editing.kind === "patch") {
      patchMutation.mutate({
        id: editing.stock.id,
        quantity: q,
        minQuantity: mn,
        maxQuantity: mx,
      });
    } else {
      upsertMutation.mutate({
        organizationId: me.organisationId,
        productId: editing.product.id,
        quantity: q,
        minQuantity: mn,
        maxQuantity: mx,
      });
    }
  }

  function submitOrderFromModal() {
    if (!orderModal) return;
    const qty = Number(orderQty);
    if (!Number.isInteger(qty) || qty < 1) {
      alert("Quantité invalide");
      return;
    }
    const { suppliers } = orderModal;
    const supplierId =
      suppliers.length === 1 && suppliers[0]
        ? suppliers[0].id
        : orderSupplierId;
    if (!supplierId) {
      alert("Choisissez un fournisseur.");
      return;
    }
    createOrderMutation.mutate({
      productId: orderModal.productId,
      supplierId,
      quantity: qty,
      note: orderNote.trim() || undefined,
    });
  }

  function openOrderModal(product: ProductDto) {
    const suppliers = suppliersForProduct(product);
    setOrderModal({
      productId: product.id,
      productName: product.name,
      suppliers,
    });
    setOrderSupplierId(suppliers[0]?.id ?? "");
    setOrderQty("1");
    setOrderNote("");
  }

  const stockTableLoading =
    isLoading ||
    Boolean(me && !isMain && canReadCatalog && catalogLoading);

  const hasStockRows = isMain
    ? mainFiltered.length > 0
    : subsidiaryFiltered.length > 0;

  return (
    <main className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-8 overflow-auto bg-[#F3F4F6] p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl bg-white shadow-sm"
          style={{ color: ORANGE }}
          aria-hidden
        >
          <Layers className="size-6" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-wide text-[#2D323E]">
            Stocks
          </h1>
          <p className="text-sm text-gray-600">
            {isMain ? (
              <>
                Stocks par filiale et produit (pas de stock maison mère). La
                maison mère voit toutes les filiales. Les lignes en alerte sont
                sous le seuil minimum.
              </>
            ) : (
              <>
                Chaque produit de votre catalogue est listé avec le stock
                actuel (0 si pas encore saisi). Utilisez{" "}
                <span className="font-medium">Commander au fournisseur</span>{" "}
                pour passer une commande de réapprovisionnement, puis confirmez
                la réception dans les commandes ci-dessous pour augmenter le
                stock.
              </>
            )}
          </p>
        </div>
      </header>

      <div className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            isMain
              ? "Filtrer par produit ou organisation…"
              : "Filtrer par produit…"
          }
          className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-4 text-sm text-[#2D323E] shadow-sm outline-none focus:border-[#FF8C00] focus:ring-2 focus:ring-[#FF8C00]/25"
        />
      </div>

      {isError && (
        <p className="text-sm text-red-600">Impossible de charger les stocks.</p>
      )}

      {mePending ? (
        <p className="text-sm text-gray-600">Vérification des droits…</p>
      ) : null}

      {stockTableLoading ? (
        <p className="text-gray-600">Chargement des stocks…</p>
      ) : !hasStockRows ? (
        <p className="text-gray-600">
          {isMain
            ? stocks.length === 0
              ? "Aucune ligne de stock filiale."
              : "Aucun résultat pour ce filtre."
            : search.trim()
              ? "Aucun résultat pour ce filtre."
              : canReadCatalog && catalogProducts.length === 0
                ? "Aucun produit dans votre catalogue : la maison mère doit vous attribuer des catégories/produits et des fournisseurs sur les produits."
                : !canReadCatalog && stocks.length === 0
                  ? "Aucun stock enregistré et pas d’accès lecture au catalogue produits."
                  : "Aucune ligne à afficher."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <TableScroll bleed className="rounded-none border-0">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Organisation
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Produit
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Fournisseur
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Prix ref.
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Qté
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Min
                  </th>
                  <th className="px-4 py-3 font-semibold text-[#2D323E]">
                    Max
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isMain
                  ? mainFiltered.map((s) => {
                      const alert = lowStockRowKeysMain.has(s.id);
                      const productSuppliers = suppliersForProduct(s.product);
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-gray-100 last:border-0 ${
                            alert ? "bg-amber-50/80" : "hover:bg-gray-50/60"
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-800">
                            <span className="flex items-center gap-2">
                              {alert && (
                                <AlertTriangle
                                  className="size-4 shrink-0 text-amber-600"
                                  aria-label="Sous le seuil"
                                />
                              )}
                              {s.organization.name}
                              <span className="rounded bg-gray-100 px-1.5 text-[10px] uppercase text-gray-500">
                                Filiale
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {s.product.name}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {productSuppliers.length > 0 ? (
                              productSuppliers.map((x) => x.name).join(", ")
                            ) : (
                              <span className="text-amber-700">
                                Aucun (maison mère)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatFcfa(parseDecimal(s.product.price))}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#2D323E]">
                            {s.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.minQuantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {s.maxQuantity ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canCreateOrder && (
                                <button
                                  type="button"
                                  title={
                                    productSuppliers.length > 0
                                      ? "Commander au fournisseur pour réapprovisionner"
                                      : "La maison mère doit associer au moins un fournisseur au produit."
                                  }
                                  onClick={() => openOrderModal(s.product)}
                                  disabled={productSuppliers.length === 0}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                  style={{ backgroundColor: ORANGE }}
                                >
                                  <Package className="size-3.5" />
                                  Commander au fournisseur
                                </button>
                              )}
                              {canUpdateStock ? (
                                <button
                                  type="button"
                                  onClick={() => openEditMain(s)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2D323E] transition-colors hover:bg-gray-50"
                                >
                                  <Pencil className="size-3.5" />
                                  Modifier
                                </button>
                              ) : null}
                              {!canCreateOrder && !canUpdateStock ? (
                                <span className="text-gray-400">—</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  : subsidiaryFiltered.map((r) => {
                      const alert = lowStockRowKeysSub.has(r.rowKey);
                      const productSuppliers = suppliersForProduct(r.product);
                      return (
                        <tr
                          key={r.rowKey}
                          className={`border-b border-gray-100 last:border-0 ${
                            alert ? "bg-amber-50/80" : "hover:bg-gray-50/60"
                          }`}
                        >
                          <td className="px-4 py-3 text-gray-800">
                            <span className="flex items-center gap-2">
                              {alert && (
                                <AlertTriangle
                                  className="size-4 shrink-0 text-amber-600"
                                  aria-label="Sous le seuil"
                                />
                              )}
                              {r.organizationLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {r.product.name}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {productSuppliers.length > 0 ? (
                              productSuppliers.map((x) => x.name).join(", ")
                            ) : (
                              <span className="text-amber-700">
                                Aucun (maison mère)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {formatFcfa(parseDecimal(r.product.price))}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#2D323E]">
                            {r.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.minQuantity}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {r.maxQuantity ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {canCreateOrder && (
                                <button
                                  type="button"
                                  title={
                                    productSuppliers.length > 0
                                      ? "Envoyer une commande de réapprovisionnement au fournisseur choisi"
                                      : "La maison mère doit associer au moins un fournisseur au produit."
                                  }
                                  onClick={() => openOrderModal(r.product)}
                                  disabled={productSuppliers.length === 0}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                  style={{ backgroundColor: ORANGE }}
                                >
                                  <Package className="size-3.5" />
                                  Commander au fournisseur
                                </button>
                              )}
                              {canUpdateStock ? (
                                <button
                                  type="button"
                                  onClick={() => openEditSubsidiary(r)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2D323E] transition-colors hover:bg-gray-50"
                                >
                                  <Pencil className="size-3.5" />
                                  Modifier
                                </button>
                              ) : null}
                              {!canCreateOrder && !canUpdateStock ? (
                                <span className="text-gray-400">—</span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </TableScroll>
        </div>
      )}

      {canReadOrders && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardList
              className="size-6 text-[#2D323E]"
              strokeWidth={1.75}
            />
            <h2 className="text-lg font-bold text-[#2D323E]">
              Commandes de réapprovisionnement
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            Les filiales choisissent le fournisseur parmi ceux associés au
            produit par la maison mère. La filiale confirme la réception pour
            ajouter la quantité à son stock. La maison mère peut refuser une
            commande en attente.
          </p>

          {!isMain && canUpdateOrder ? (
            <StockOrderBudgetConfirmHint />
          ) : null}

          {isMain && orderSubsidiaries.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor="order-subsidiary-filter"
                className="text-sm font-medium text-[#2D323E]"
              >
                Filiale
              </label>
              <select
                id="order-subsidiary-filter"
                value={orderSubsidiaryFilter}
                onChange={(e) => setOrderSubsidiaryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value={ALL_SUBSIDIARIES}>Toutes les filiales</option>
                {orderSubsidiaries.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {ordersLoading ? (
            <p className="text-sm text-gray-600">Chargement des commandes…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-gray-600">Aucune commande.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <TableScroll bleed className="rounded-none border-0">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Date
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Filiale
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Produit
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Fournisseur
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Qté
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Prix unit. (FCFA)
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                        Total (FCFA)
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Statut
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Budget
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#2D323E]">
                        Demandeur
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-[#2D323E]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr
                        key={o.id}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60"
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {new Date(o.createdAt).toLocaleString("fr-FR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {o.subsidiaryOrganization.name}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {o.product.name}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {o.supplier.name}
                        </td>
                        <td className="px-4 py-3">{o.quantity}</td>
                        <td className="px-4 py-3 font-mono text-gray-800">
                          {formatFcfa(parseDecimal(o.unitPrice))}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                          {formatFcfa(
                            parseDecimal(o.unitPrice) * o.quantity,
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              o.status === "PENDING"
                                ? "bg-amber-100 text-amber-900"
                                : o.status === "CONFIRMED"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {STATUS_LABEL[o.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StockOrderBudgetBadge budgetLink={o.budgetLink} />
                        </td>
                        <td className="px-4 py-3">
                          <StockOrderRequesterCell requester={o.requestedBy} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canUpdateOrder && o.status === "PENDING" ? (
                            <div className="flex flex-wrap justify-end gap-2">
                              {isMain && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    orderStatusMutation.mutate({
                                      id: o.id,
                                      status: "CANCELLED",
                                    })
                                  }
                                  disabled={orderStatusMutation.isPending}
                                  className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                  Refuser
                                </button>
                              )}
                              {!isMain && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      orderStatusMutation.mutate({
                                        id: o.id,
                                        status: "CONFIRMED",
                                      })
                                    }
                                    disabled={orderStatusMutation.isPending}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                  >
                                    Confirmer la réception
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      orderStatusMutation.mutate({
                                        id: o.id,
                                        status: "CANCELLED",
                                      })
                                    }
                                    disabled={orderStatusMutation.isPending}
                                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50"
                                  >
                                    Annuler
                                  </button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            </div>
          )}
        </section>
      )}

      {orderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-order-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="stock-order-title"
              className="text-lg font-bold text-[#2D323E]"
            >
              Commander chez le fournisseur
            </h2>
            <p className="mt-1 text-sm text-gray-600">{orderModal.productName}</p>
            {orderModal.suppliers.length === 1 && orderModal.suppliers[0] ? (
              <p className="mt-3 text-sm text-gray-800">
                Fournisseur :{" "}
                <span className="font-semibold">
                  {orderModal.suppliers[0].name}
                </span>
              </p>
            ) : (
              <div className="mt-4">
                <label
                  htmlFor="order-supplier"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Fournisseur
                </label>
                <select
                  id="order-supplier"
                  value={orderSupplierId}
                  onChange={(e) => setOrderSupplierId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                >
                  <option value="">— Choisir —</option>
                  {orderModal.suppliers.map((su) => (
                    <option key={su.id} value={su.id}>
                      {su.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="order-qty"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Quantité
                </label>
                <input
                  id="order-qty"
                  type="number"
                  min={1}
                  step={1}
                  value={orderQty}
                  onChange={(e) => setOrderQty(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="order-note"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Note (optionnel)
                </label>
                <input
                  id="order-note"
                  type="text"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="Référence, commentaire…"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOrderModal(null)}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={submitOrderFromModal}
                disabled={createOrderMutation.isPending}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {createOrderMutation.isPending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="stock-edit-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2
              id="stock-edit-title"
              className="text-lg font-bold text-[#2D323E]"
            >
              Ajuster le stock
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {editing.kind === "patch"
                ? `${editing.stock.product.name} — ${editing.stock.organization.name}`
                : `${editing.product.name} — ${me?.organisationName ?? ""}`}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label
                  htmlFor="edit-qty"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Quantité
                </label>
                <input
                  id="edit-qty"
                  type="number"
                  min={0}
                  step={1}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-min"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Seuil minimum
                </label>
                <input
                  id="edit-min"
                  type="number"
                  min={0}
                  step={1}
                  value={editMin}
                  onChange={(e) => setEditMin(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-max"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Seuil maximum (vide = sans plafond)
                </label>
                <input
                  id="edit-max"
                  type="number"
                  min={0}
                  step={1}
                  value={editMax}
                  onChange={(e) => setEditMax(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm"
                  placeholder="Optionnel"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitEdit}
                disabled={patchMutation.isPending || upsertMutation.isPending}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {patchMutation.isPending || upsertMutation.isPending
                  ? "Enregistrement…"
                  : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
