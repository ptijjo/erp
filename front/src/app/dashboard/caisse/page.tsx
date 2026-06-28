"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Minus, Plus, ScanLine, ShoppingCart, Trash2 } from "lucide-react";

import { CaisseCloseSessionDialog } from "./_components/CaisseCloseSessionDialog";
import { CaisseDraftTicketsPanel } from "./_components/CaisseDraftTicketsPanel";
import { CaisseOpenSession } from "./_components/CaisseOpenSession";
import { CaisseSessionBar } from "./_components/CaisseSessionBar";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { hasMePermission, useMe } from "~/hooks/use-me";
import {
  canOperateCaisse,
  canSeeCaisseNav,
} from "~/lib/dashboard-navigation";
import { api } from "~/lib/api";
import type {
  ConfirmVenteDto,
  ModePaiementDto,
  SessionCaisseCurrentDto,
  VenteDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { formatFcfa } from "~/lib/format-fcfa";
import { parseDecimal } from "~/lib/parse-decimal";
import { cn } from "~/lib/utils";

const MODE_LABEL: Record<ModePaiementDto, string> = {
  ESPECES: "Espèces",
  CARTE: "Carte",
  MOBILE_MONEY: "Mobile money",
};

export default function CaissePage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canSell = me != null && hasMePermission(me, "create", "Vente");
  const canSession =
    me != null && hasMePermission(me, "create", "SessionCaisse");
  const canViewCaisse = me != null && canSeeCaisseNav(me);
  const canOperate = me != null && canOperateCaisse(me);
  const canReadSession =
    me != null && hasMePermission(me, "read", "SessionCaisse");
  const canCloseSession =
    me != null && hasMePermission(me, "update", "SessionCaisse");
  const qrRef = useRef<HTMLInputElement>(null);
  const creatingVenteRef = useRef(false);

  const [venteId, setVenteId] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<ModePaiementDto>("ESPECES");
  const [cashReceived, setCashReceived] = useState("");
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const {
    data: currentSession,
    isLoading: sessionLoading,
    refetch: refetchSession,
  } = useQuery({
    queryKey: ["session-caisse", "current"] as const,
    queryFn: async () => {
      const { data } = await api.get<SessionCaisseCurrentDto | null>(
        "/session-caisse/current",
      );
      return data;
    },
    enabled: canSession || canCloseSession || (canReadSession && !canOperate),
  });

  const sessionOpen = currentSession?.statut === "OUVERTE";

  const createVenteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<VenteDto>("/vente");
      return data;
    },
    onSuccess: (data) => {
      creatingVenteRef.current = false;
      setVenteId(data.id);
      void queryClient.invalidateQueries({ queryKey: ["vente", data.id] });
      void queryClient.invalidateQueries({
        queryKey: ["session-caisse", "current"],
      });
      if (currentSession?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["vente", "drafts", currentSession.id],
        });
      }
    },
    onError: () => {
      creatingVenteRef.current = false;
    },
  });

  useEffect(() => {
    if (
      !canSell ||
      !sessionOpen ||
      venteId ||
      createVenteMutation.isPending ||
      createVenteMutation.isError ||
      creatingVenteRef.current
    ) {
      return;
    }
    creatingVenteRef.current = true;
    createVenteMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nouveau ticket quand session ouverte
  }, [canSell, sessionOpen, venteId, createVenteMutation.isPending, createVenteMutation.isError]);

  const { data: sessionDrafts = [] } = useQuery({
    queryKey: ["vente", "drafts", currentSession?.id] as const,
    queryFn: async () => {
      const { data } = await api.get<VenteDto[]>("/vente");
      return data.filter(
        (item) =>
          item.status === "DRAFT" &&
          item.sessionCaisseId === currentSession!.id,
      );
    },
    enabled: Boolean(sessionOpen && currentSession?.id && canOperate),
  });

  useEffect(() => {
    if (!currentSession?.id || !sessionOpen || sessionDrafts.length === 0) {
      return;
    }

    const orphanEmptyDrafts = sessionDrafts.filter(
      (draft) => draft.lines.length === 0 && draft.id !== venteId,
    );
    if (orphanEmptyDrafts.length === 0) {
      return;
    }

    void (async () => {
      for (const draft of orphanEmptyDrafts) {
        try {
          await api.post(`/vente/${draft.id}/cancel`);
        } catch {
          /* nettoyage best-effort des tickets vides orphelins */
        }
      }
      void queryClient.invalidateQueries({
        queryKey: ["vente", "drafts", currentSession.id],
      });
    })();
  }, [sessionDrafts, venteId, currentSession?.id, sessionOpen, queryClient]);

  const { data: vente, isLoading } = useQuery({
    queryKey: ["vente", venteId] as const,
    queryFn: async () => {
      const { data } = await api.get<VenteDto>(`/vente/${venteId}`);
      return data;
    },
    enabled: Boolean(venteId),
  });

  const addLineMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const { data } = await api.post<VenteDto>(`/vente/${venteId}/lines`, {
        qrCode,
        quantity: 1,
      });
      return data;
    },
    onSuccess: (data) => {
      setQrInput("");
      setScanMessage(null);
      void queryClient.setQueryData(["vente", venteId], data);
      void queryClient.invalidateQueries({
        queryKey: ["session-caisse", "current"],
      });
      if (currentSession?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["vente", "drafts", currentSession.id],
        });
      }
      qrRef.current?.focus();
    },
    onError: (e) => {
      setScanMessage(apiErrorMessage(e, "Produit non ajouté"));
    },
  });

  const cancelVenteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<VenteDto>(`/vente/${id}/cancel`);
      return data;
    },
    onSuccess: async () => {
      setVenteId(null);
      void queryClient.invalidateQueries({
        queryKey: ["session-caisse", "current"],
      });
      if (currentSession?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["vente", "drafts", currentSession.id],
        });
      }
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible d’annuler le ticket"));
    },
  });

  const removeLineMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const { data } = await api.delete<VenteDto>(
        `/vente/${venteId}/lines/${lineId}`,
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(["vente", venteId], data);
      if (currentSession?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["vente", "drafts", currentSession.id],
        });
      }
    },
  });

  const updateLineMutation = useMutation({
    mutationFn: async ({
      lineId,
      quantity,
    }: {
      lineId: string;
      quantity: number;
    }) => {
      const { data } = await api.patch<VenteDto>(
        `/vente/${venteId}/lines/${lineId}`,
        { quantity },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.setQueryData(["vente", venteId], data);
      if (currentSession?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["vente", "drafts", currentSession.id],
        });
      }
    },
    onError: (error) => {
      alert(apiErrorMessage(error, "Impossible de modifier la quantité"));
    },
  });

  function changeLineQuantity(lineId: string, currentQuantity: number, delta: number) {
    const nextQuantity = currentQuantity + delta;
    if (nextQuantity < 1) {
      removeLineMutation.mutate(lineId);
      return;
    }
    updateLineMutation.mutate({ lineId, quantity: nextQuantity });
  }

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!vente) throw new Error("Panier vide");
      const total = parseDecimal(vente.totalAmount);
      const { data } = await api.post<ConfirmVenteDto>(
        `/vente/${venteId}/confirm`,
        {
          paiements: [{ modePaiement: paymentMode, amount: total }],
        },
      );
      return data;
    },
    onSuccess: (data) => {
      if (data.lowStockAlerts.length > 0) {
        const names = data.lowStockAlerts
          .map((a) => `${a.productName} (${a.quantity} ≤ seuil ${a.minQuantity})`)
          .join(", ");
        alert(
          `Vente enregistrée. Stock bas : ${names}. Pensez à commander au fournisseur.`,
        );
      }
      if (venteId) {
        void queryClient.removeQueries({ queryKey: ["vente", venteId] });
      }
      setVenteId(null);
      setCashReceived("");
      void queryClient.invalidateQueries({
        queryKey: ["session-caisse", "current"],
      });
      if (currentSession?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["vente", "drafts", currentSession.id],
        });
      }
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de valider la vente"));
    },
  });

  function handleSelectDraft(nextVenteId: string) {
    if (!nextVenteId) {
      setVenteId(null);
      setCashReceived("");
      return;
    }
    setVenteId(nextVenteId);
    setCashReceived("");
  }

  async function handleScanSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = qrInput.trim();
    if (!code || !venteId) return;
    addLineMutation.mutate(code);
  }

  function handleSessionClosed() {
    setVenteId(null);
    setFondClotureReset();
    void refetchSession();
  }

  function setFondClotureReset() {
    setQrInput("");
    setScanMessage(null);
    setCashReceived("");
  }

  const total = vente ? parseDecimal(vente.totalAmount) : 0;
  const isDraft = vente?.status === "DRAFT";

  const cashReceivedAmount = useMemo(() => {
    const trimmed = cashReceived.trim();
    if (!trimmed) return null;
    const amount = parseDecimal(trimmed.replace(",", "."));
    return Number.isFinite(amount) ? amount : null;
  }, [cashReceived]);

  const cashChange =
    paymentMode === "ESPECES" && cashReceivedAmount != null
      ? cashReceivedAmount - total
      : null;

  const canConfirmCashPayment =
    paymentMode !== "ESPECES" ||
    (cashReceivedAmount != null && cashReceivedAmount >= total);

  const anySessionDraftWithLines = sessionDrafts.some(
    (draft) => draft.lines.length > 0,
  );

  if (!canViewCaisse) {
    return (
      <PageShell>
        <PageHeader
          title="Caisse"
          description="Vous n’avez pas les droits pour accéder à la caisse."
        />
      </PageShell>
    );
  }

  if (!canOperate) {
    return (
      <PageShell>
        <PageHeader
          title="Caisse"
          description="Consultation uniquement — vous ne pouvez pas ouvrir de session ni vendre avec votre rôle actuel."
        />
        <div className="mt-6 max-w-lg space-y-4 text-sm text-muted-foreground">
          {canReadSession ? (
            sessionLoading ? (
              <p>Chargement de la session en cours…</p>
            ) : currentSession?.statut === "OUVERTE" ? (
              <div className="rounded-xl border bg-card p-4 text-foreground">
                <p className="font-medium">Session ouverte</p>
                <p className="mt-1 text-muted-foreground">
                  Ouverte le{" "}
                  {new Date(currentSession.openedAt).toLocaleString("fr-FR")}
                  {" · "}
                  {currentSession.live.nombreVentes} vente(s) —{" "}
                  {formatFcfa(currentSession.live.totalVentesFcfa)}
                </p>
              </div>
            ) : (
              <p>Aucune session de caisse ouverte pour le moment.</p>
            )
          ) : null}
          <div className="rounded-xl border bg-card p-6">
            <p>
              Pour ouvrir une session et encaisser, il faut les permissions{" "}
              <strong className="text-foreground">create:SessionCaisse</strong>{" "}
              et <strong className="text-foreground">create:Vente</strong> sur
              votre rôle (Utilisateurs → Rôles → permissions).
            </p>
            <p className="mt-3">
              Consultez l’historique dans{" "}
              <a
                href="/dashboard/compte"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Mes sessions caisse
              </a>
              .
            </p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (sessionLoading) {
    return (
      <PageShell>
        <PageHeader title="Caisse" description="Chargement…" />
      </PageShell>
    );
  }

  if (!sessionOpen) {
    return (
      <PageShell>
        <PageHeader
          title="Caisse"
          description="Démarrez votre service avec un fond de caisse, puis enregistrez vos ventes."
        />
        {canSession ? (
          <div className="mt-8">
            <CaisseOpenSession onOpened={() => void refetchSession()} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Vous pouvez vendre mais pas ouvrir de session — contactez un
            administrateur pour les droits « Sessions de caisse ».
          </p>
        )}
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Caisse"
        description="Scannez un QR produit, validez la vente — le stock est décrémenté automatiquement."
      />

      <div className="mt-4">
        <CaisseSessionBar
          session={currentSession!}
          onCloseClick={() => setCloseDialogOpen(true)}
          canClose={canCloseSession}
        />
      </div>

      <CaisseCloseSessionDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        session={currentSession!}
        sessionDrafts={sessionDrafts}
        draftVenteHasLines={anySessionDraftWithLines}
        onClosed={handleSessionClosed}
        onSelectDraft={handleSelectDraft}
      />

      {sessionDrafts.length > 1 ? (
        <div className="mt-4">
          <CaisseDraftTicketsPanel
            drafts={sessionDrafts}
            activeVenteId={venteId}
            sessionId={currentSession!.id}
            onSelectDraft={handleSelectDraft}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-4">
          <form
            onSubmit={handleScanSubmit}
            className="rounded-xl border bg-card p-4 shadow-sm"
          >
            <Label htmlFor="qr-scan" className="flex items-center gap-2">
              <ScanLine className="size-4" />
              Scan QR / saisie code
            </Label>
            <div className="mt-2 flex gap-2">
              <Input
                id="qr-scan"
                ref={qrRef}
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Flashez ou collez le QR…"
                autoComplete="off"
                disabled={!isDraft || addLineMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!isDraft || !qrInput.trim() || addLineMutation.isPending}
              >
                Ajouter
              </Button>
            </div>
            {scanMessage ? (
              <p className="mt-2 flex items-center gap-1 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0" />
                {scanMessage}
              </p>
            ) : null}
          </form>

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="border-b px-4 py-3 font-semibold">Panier</div>
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Chargement…</p>
            ) : !vente?.lines.length ? (
              <p className="p-4 text-sm text-muted-foreground">
                Aucune ligne — scannez un produit pour commencer.
              </p>
            ) : (
              <ul className="divide-y">
                {vente.lines.map((line) => {
                  const lineBusy =
                    (updateLineMutation.isPending &&
                      updateLineMutation.variables?.lineId === line.id) ||
                    (removeLineMutation.isPending &&
                      removeLineMutation.variables === line.id);

                  return (
                  <li
                    key={line.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{line.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFcfa(parseDecimal(line.unitPrice))} / unité
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isDraft ? (
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            disabled={lineBusy}
                            onClick={() =>
                              changeLineQuantity(line.id, line.quantity, -1)
                            }
                            aria-label="Diminuer la quantité"
                          >
                            <Minus className="size-4" />
                          </Button>
                          <Input
                            key={`${line.id}-${line.quantity}`}
                            type="number"
                            min={1}
                            inputMode="numeric"
                            defaultValue={line.quantity}
                            disabled={lineBusy}
                            onBlur={(event) => {
                              const parsed = Number.parseInt(
                                event.target.value,
                                10,
                              );
                              if (Number.isNaN(parsed) || parsed < 1) {
                                event.target.value = String(line.quantity);
                                return;
                              }
                              if (parsed !== line.quantity) {
                                updateLineMutation.mutate({
                                  lineId: line.id,
                                  quantity: parsed,
                                });
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.currentTarget.blur();
                              }
                            }}
                            className="h-8 w-14 px-1 text-center tabular-nums"
                            aria-label={`Quantité pour ${line.product.name}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 shrink-0"
                            disabled={lineBusy}
                            onClick={() =>
                              changeLineQuantity(line.id, line.quantity, 1)
                            }
                            aria-label="Augmenter la quantité"
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="min-w-8 text-center font-mono tabular-nums">
                          {line.quantity}
                        </span>
                      )}
                      <span className="min-w-20 text-right font-mono font-semibold tabular-nums">
                        {formatFcfa(
                          parseDecimal(line.unitPrice) * line.quantity,
                        )}
                      </span>
                      {isDraft ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={lineBusy}
                          onClick={() => removeLineMutation.mutate(line.id)}
                          aria-label="Retirer la ligne"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShoppingCart className="size-4" />
              <span className="text-sm font-medium uppercase tracking-wide">
                Total
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {formatFcfa(total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {vente?.numeroTicket != null
                ? `Ticket n°${vente.numeroTicket}`
                : "Brouillon"}{" "}
              · {vente?.status ?? "…"}
            </p>
          </div>

          {isDraft && vente ? (
            <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
              {vente.lines.length > 0 ? (
                <>
              <Label>Mode de paiement</Label>
              <Select
                value={paymentMode}
                onValueChange={(value) => {
                  setPaymentMode(value as ModePaiementDto);
                  if (value !== "ESPECES") {
                    setCashReceived("");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(MODE_LABEL) as ModePaiementDto[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MODE_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentMode === "ESPECES" ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="cash-received">
                      Montant reçu du client
                    </Label>
                    <Input
                      id="cash-received"
                      inputMode="decimal"
                      autoComplete="off"
                      value={cashReceived}
                      onChange={(event) => setCashReceived(event.target.value)}
                      placeholder="Ex. 15000"
                      className="mt-2"
                    />
                  </div>
                  {cashReceivedAmount != null ? (
                    <div
                      className={cn(
                        "rounded-lg border px-3 py-2",
                        cashChange != null && cashChange < 0
                          ? "border-destructive/40 bg-destructive/5"
                          : "border-primary/20 bg-primary/5",
                      )}
                    >
                      <p className="text-xs text-muted-foreground">
                        {cashChange != null && cashChange < 0
                          ? "Montant insuffisant"
                          : "Monnaie à rendre"}
                      </p>
                      <p
                        className={cn(
                          "text-xl font-bold tabular-nums",
                          cashChange != null && cashChange < 0
                            ? "text-destructive"
                            : "text-foreground",
                        )}
                      >
                        {cashChange != null && cashChange < 0
                          ? `Manque ${formatFcfa(Math.abs(cashChange))}`
                          : formatFcfa(cashChange ?? 0)}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <Button
                className="w-full"
                size="lg"
                onClick={() => confirmMutation.mutate()}
                disabled={
                  confirmMutation.isPending || !canConfirmCashPayment
                }
              >
                Valider la vente
              </Button>
              <p className="text-xs text-muted-foreground">
                Le stock sera vérifié et décrémenté. Vente refusée si quantité
                insuffisante.
              </p>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => venteId && cancelVenteMutation.mutate(venteId)}
                  disabled={cancelVenteMutation.isPending}
                >
                  Annuler le ticket vide
                </Button>
              )}
            </div>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}
