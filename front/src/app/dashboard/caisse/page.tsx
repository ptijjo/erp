"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ScanLine, ShoppingCart, Trash2 } from "lucide-react";

import { CaisseCloseSessionDialog } from "./_components/CaisseCloseSessionDialog";
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
  const qrRef = useRef<HTMLInputElement>(null);

  const [venteId, setVenteId] = useState<string | null>(null);
  const [qrInput, setQrInput] = useState("");
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<ModePaiementDto>("ESPECES");
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
    enabled: canSession || (canReadSession && !canOperate),
  });

  const sessionOpen = currentSession?.statut === "OUVERTE";

  const createVenteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<VenteDto>("/vente");
      return data;
    },
    onSuccess: (data) => {
      setVenteId(data.id);
      void queryClient.invalidateQueries({ queryKey: ["vente", data.id] });
      void queryClient.invalidateQueries({
        queryKey: ["session-caisse", "current"],
      });
    },
  });

  useEffect(() => {
    if (
      canSell &&
      sessionOpen &&
      !venteId &&
      !createVenteMutation.isPending &&
      !createVenteMutation.isError
    ) {
      createVenteMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nouveau ticket quand session ouverte
  }, [canSell, sessionOpen, venteId]);

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
    },
  });

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
      setVenteId(null);
      void queryClient.invalidateQueries({
        queryKey: ["session-caisse", "current"],
      });
      createVenteMutation.mutate();
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Impossible de valider la vente"));
    },
  });

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
  }

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

  const total = vente ? parseDecimal(vente.totalAmount) : 0;
  const isDraft = vente?.status === "DRAFT";

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
        />
      </div>

      <CaisseCloseSessionDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        session={currentSession!}
        draftVenteId={isDraft ? venteId : null}
        draftVenteHasLines={Boolean(isDraft && vente && vente.lines.length > 0)}
        onClosed={handleSessionClosed}
      />

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
                {vente.lines.map((line) => (
                  <li
                    key={line.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{line.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.quantity} × {formatFcfa(parseDecimal(line.unitPrice))}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold tabular-nums">
                        {formatFcfa(
                          parseDecimal(line.unitPrice) * line.quantity,
                        )}
                      </span>
                      {isDraft ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineMutation.mutate(line.id)}
                          aria-label="Retirer la ligne"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
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
                onValueChange={(v) => setPaymentMode(v as ModePaiementDto)}
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
              <Button
                className="w-full"
                size="lg"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
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
