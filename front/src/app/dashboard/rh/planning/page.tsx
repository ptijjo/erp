"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ListPagination } from "../_components/ListPagination";
import { employeeDisplayName } from "../_lib/employee-display";
import { fetchHrAllItems, fetchHrPage } from "../_lib/hr-list";
import {
  dateInputToIso,
  dateTimeInputToIso,
  formatDateTime,
  isoToDateTimeInput,
  minutesToTime,
  mondayInputOf,
  timeToMinutes,
} from "../_lib/date-input";
import {
  WEEK_DAY_LABEL,
  WEEK_DAY_OPTIONS,
  WORK_SHIFT_KIND_LABEL,
  WORK_SHIFT_KIND_OPTIONS,
  WORK_SHIFT_STATUS_LABEL,
  WORK_SHIFT_STATUS_OPTIONS,
} from "../_lib/hr-labels";
import {
  PlanningGrid,
  type PaintMode,
  type PlanningSegmentInput,
  type PlanningSegmentUpdate,
} from "./_components/PlanningGrid";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { TableScroll } from "~/components/layout/table-scroll";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { hasMePermission, isMainOrganization, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { cn } from "~/lib/utils";
import type {
  EmployeeDto,
  RecurringWorkShiftDto,
  WeekDayDto,
  WorkShiftDto,
  WorkShiftKindDto,
  WorkShiftStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DATE_TO_WEEKDAY: WeekDayDto[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

function weekDayFromDate(date: Date): WeekDayDto {
  return DATE_TO_WEEKDAY[date.getDay()]!;
}

/** Minuit local du jour de `date`. */
function localDayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Lundi (minuit local) de la semaine contenant `date` : base du compteur
 * d’heures hebdomadaire, remis à zéro chaque lundi à 00h.
 */
function localMonday(date: Date): Date {
  const d = localDayStart(date);
  const offset = (d.getDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS);
}

export default function PlanningPage() {
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();

  const isMain = me != null && isMainOrganization(me);
  const canRead =
    me != null && !isMain && hasMePermission(me, "read", "WorkShift");
  const canCreate =
    me != null && !isMain && hasMePermission(me, "create", "WorkShift");
  const canUpdate =
    me != null && !isMain && hasMePermission(me, "update", "WorkShift");
  const canDelete =
    me != null && !isMain && hasMePermission(me, "delete", "WorkShift");

  // --- Vue graphique (planning type Gantt) ---
  const [view, setView] = useState<"grid" | "manage">("grid");
  const [selectedDay, setSelectedDay] = useState(() =>
    localDayStart(new Date()),
  );
  const [paintMode, setPaintMode] = useState<PaintMode>("WORK");

  const weekMonday = useMemo(() => localMonday(selectedDay), [selectedDay]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => new Date(weekMonday.getTime() + i * DAY_MS)),
    [weekMonday],
  );
  const dayStartIso = selectedDay.toISOString();
  const dayEndIso = new Date(selectedDay.getTime() + DAY_MS).toISOString();

  // Semaine du compteur d’heures : lundi 00h → lundi suivant 00h.
  const weekStartIso = weekMonday.toISOString();
  const weekEndIso = new Date(weekMonday.getTime() + 7 * DAY_MS).toISOString();

  // --- Créneau ponctuel (création) ---
  const [employeeId, setEmployeeId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [status, setStatus] = useState<WorkShiftStatusDto>("PLANNED");
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Édition inline d'un créneau ---
  const [editId, setEditId] = useState<string | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editStatus, setEditStatus] = useState<WorkShiftStatusDto>("PLANNED");
  const [editNote, setEditNote] = useState("");

  // --- Modèle récurrent (création) ---
  const [recEmployeeId, setRecEmployeeId] = useState("");
  const [recDay, setRecDay] = useState<WeekDayDto>("MONDAY");
  const [recKind, setRecKind] = useState<WorkShiftKindDto>("WORK");
  const [recStart, setRecStart] = useState("08:00");
  const [recEnd, setRecEnd] = useState("17:00");
  const [recNote, setRecNote] = useState("");
  const [recError, setRecError] = useState<string | null>(null);

  // --- Édition inline d'un modèle ---
  const [editRecId, setEditRecId] = useState<string | null>(null);
  const [editRecDay, setEditRecDay] = useState<WeekDayDto>("MONDAY");
  const [editRecKind, setEditRecKind] = useState<WorkShiftKindDto>("WORK");
  const [editRecStart, setEditRecStart] = useState("08:00");
  const [editRecEnd, setEditRecEnd] = useState("17:00");
  const [editRecNote, setEditRecNote] = useState("");

  // --- Génération de semaine ---
  const [weekStart, setWeekStart] = useState(() => mondayInputOf());
  const [generateInfo, setGenerateInfo] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr", "work-shifts", page] as const,
    queryFn: () => fetchHrPage<WorkShiftDto>("/hr/work-shifts", { page }),
    enabled: !mePending && canRead,
  });
  const shifts = data?.items ?? [];
  const meta = data?.meta;

  const { data: recurring = [] } = useQuery({
    queryKey: ["hr", "recurring-work-shifts"] as const,
    queryFn: async () => {
      const res = await api.get<RecurringWorkShiftDto[]>(
        "/hr/recurring-work-shifts",
      );
      return res.data;
    },
    enabled: !mePending && canRead,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr", "employees", "picker"] as const,
    queryFn: () => fetchHrAllItems<EmployeeDto>("/hr/employees"),
    enabled: !mePending && canRead,
  });

  // Employés affichables dans la grille (on masque les départs définitifs).
  const gridEmployees = useMemo(
    () => employees.filter((e) => e.status !== "TERMINATED"),
    [employees],
  );

  const { data: calendarShifts = [] } = useQuery({
    queryKey: ["hr", "work-shifts", "calendar", dayStartIso] as const,
    queryFn: async () => {
      const res = await api.get<WorkShiftDto[]>("/hr/work-shifts/calendar", {
        params: { from: dayStartIso, to: dayEndIso },
      });
      return res.data;
    },
    enabled: !mePending && canRead && view === "grid",
  });

  const { data: weekShifts = [] } = useQuery({
    queryKey: ["hr", "work-shifts", "week", weekStartIso] as const,
    queryFn: async () => {
      const res = await api.get<WorkShiftDto[]>("/hr/work-shifts/calendar", {
        params: { from: weekStartIso, to: weekEndIso },
      });
      return res.data;
    },
    enabled: !mePending && canRead && view === "grid",
  });

  /** Minutes travaillées (kind WORK) par employé sur la semaine lundi→dimanche. */
  const weeklyWorkedMinutes = useMemo(() => {
    const totals = new Map<string, number>();
    for (const shift of weekShifts) {
      if (shift.kind !== "WORK") {
        continue;
      }
      const minutes =
        (new Date(shift.endAt).getTime() - new Date(shift.startAt).getTime()) /
        60000;
      if (minutes <= 0) {
        continue;
      }
      totals.set(shift.employeeId, (totals.get(shift.employeeId) ?? 0) + minutes);
    }
    return totals;
  }, [weekShifts]);

  const selectedWeekDay = useMemo(
    () => weekDayFromDate(selectedDay),
    [selectedDay],
  );

  /** Modèles hebdomadaires actifs pour le jour affiché (surcouche pointillée). */
  const dayRecurringPatterns = useMemo(
    () =>
      recurring
        .filter((r) => r.active && r.dayOfWeek === selectedWeekDay)
        .map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          kind: r.kind,
        })),
    [recurring, selectedWeekDay],
  );

  const invalidateShifts = () =>
    queryClient.invalidateQueries({ queryKey: ["hr", "work-shifts"] });
  const invalidateRecurring = () =>
    queryClient.invalidateQueries({ queryKey: ["hr", "recurring-work-shifts"] });

  const paintShift = useMutation({
    mutationFn: (segment: PlanningSegmentInput) =>
      api.post("/hr/work-shifts", segment),
    onSuccess: invalidateShifts,
  });

  const eraseShift = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/work-shifts/${id}`),
    onSuccess: invalidateShifts,
  });

  const gridUpdateShift = useMutation({
    mutationFn: ({
      id,
      update,
    }: {
      id: string;
      update: PlanningSegmentUpdate;
    }) => api.patch(`/hr/work-shifts/${id}`, update),
    onSuccess: invalidateShifts,
  });

  const createShift = useMutation({
    mutationFn: async () => {
      if (!employeeId || !startAt || !endAt) {
        throw new Error("Employé et créneau requis");
      }
      await api.post("/hr/work-shifts", {
        employeeId,
        startAt: dateTimeInputToIso(startAt),
        endAt: dateTimeInputToIso(endAt),
        status,
        note: note.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      setStartAt("");
      setEndAt("");
      setNote("");
      await invalidateShifts();
    },
    onError: (err) =>
      setFormError(apiErrorMessage(err, "Impossible de créer le créneau")),
  });

  const updateShift = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/hr/work-shifts/${id}`, {
        startAt: dateTimeInputToIso(editStart),
        endAt: dateTimeInputToIso(editEnd),
        status: editStatus,
        note: editNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setEditId(null);
      await invalidateShifts();
    },
  });

  const deleteShift = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/work-shifts/${id}`),
    onSuccess: invalidateShifts,
  });

  const createRecurring = useMutation({
    mutationFn: async () => {
      if (!recEmployeeId) throw new Error("Employé requis");
      await api.post("/hr/recurring-work-shifts", {
        employeeId: recEmployeeId,
        dayOfWeek: recDay,
        kind: recKind,
        startMinute: timeToMinutes(recStart),
        endMinute: timeToMinutes(recEnd),
        note: recNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setRecError(null);
      setRecNote("");
      await invalidateRecurring();
    },
    onError: (err) =>
      setRecError(apiErrorMessage(err, "Impossible de créer le modèle")),
  });

  const updateRecurring = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/hr/recurring-work-shifts/${id}`, {
        dayOfWeek: editRecDay,
        kind: editRecKind,
        startMinute: timeToMinutes(editRecStart),
        endMinute: timeToMinutes(editRecEnd),
        note: editRecNote.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setEditRecId(null);
      await invalidateRecurring();
    },
  });

  const toggleRecurring = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/hr/recurring-work-shifts/${id}`, { active }),
    onSuccess: invalidateRecurring,
  });

  const deleteRecurring = useMutation({
    mutationFn: (id: string) => api.delete(`/hr/recurring-work-shifts/${id}`),
    onSuccess: invalidateRecurring,
  });

  const generateWeek = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ created: number }>(
        "/hr/work-shifts/generate",
        { weekStart: dateInputToIso(weekStart) },
      );
      return res.data;
    },
    onSuccess: async (res) => {
      setGenerateInfo(
        res.created > 0
          ? `${res.created} créneau(x) généré(s) pour la semaine.`
          : "Aucun nouveau créneau à générer (déjà à jour).",
      );
      await invalidateShifts();
    },
    onError: (err) =>
      setGenerateInfo(apiErrorMessage(err, "Génération impossible")),
  });

  function beginEditShift(s: WorkShiftDto) {
    setEditId(s.id);
    setEditStart(isoToDateTimeInput(s.startAt));
    setEditEnd(isoToDateTimeInput(s.endAt));
    setEditStatus(s.status);
    setEditNote(s.note ?? "");
  }

  function beginEditRecurring(r: RecurringWorkShiftDto) {
    setEditRecId(r.id);
    setEditRecDay(r.dayOfWeek);
    setEditRecKind(r.kind);
    setEditRecStart(minutesToTime(r.startMinute));
    setEditRecEnd(minutesToTime(r.endMinute));
    setEditRecNote(r.note ?? "");
  }

  const inputCls =
    "h-9 w-full rounded-lg border border-input px-2 text-sm";

  return (
    <PageShell>
      <PageHeader
        title="Planning"
        description="Emploi du temps, modèles hebdomadaires et génération de semaine."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/rh">RH</Link>
          </Button>
        }
      />

      {isMain ? (
        <p className="text-sm text-amber-800" role="alert">
          La gestion du planning est réservée aux filiales.
        </p>
      ) : !canRead ? (
        <p className="text-sm text-amber-800" role="alert">
          Vous n’avez pas la permission de consulter le planning.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-1 border-b border-border text-sm">
            {(["grid", "manage"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "border-b-2 px-4 py-2 font-medium transition",
                  view === v
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "grid" ? "Vue graphique" : "Gestion & modèles"}
              </button>
            ))}
          </div>

          {view === "grid" ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedDay((d) => new Date(d.getTime() - 7 * DAY_MS))
                  }
                >
                  ‹ Sem. préc.
                </Button>
                <div className="flex overflow-hidden rounded-lg border border-border">
                  {weekDays.map((d, i) => {
                    const active = d.getTime() === selectedDay.getTime();
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => setSelectedDay(d)}
                        className={cn(
                          "min-w-[52px] px-3 py-1.5 text-center text-xs transition",
                          active
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-muted",
                        )}
                      >
                        <div className="font-semibold">
                          {WEEKDAY_LABELS_SHORT[i]}
                        </div>
                        <div className="tabular-nums">
                          {String(d.getDate()).padStart(2, "0")}/
                          {String(d.getMonth() + 1).padStart(2, "0")}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelectedDay((d) => new Date(d.getTime() + 7 * DAY_MS))
                  }
                >
                  Sem. suiv. ›
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(localDayStart(new Date()))}
                >
                  Aujourd’hui
                </Button>
              </div>

              {canCreate || canDelete ? (
                <div className="flex flex-wrap items-center gap-3">
                  {canCreate ? (
                    <div className="flex overflow-hidden rounded-lg border border-border text-sm">
                      {WORK_SHIFT_KIND_OPTIONS.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPaintMode(value)}
                          className={cn(
                            "px-3 py-1.5 font-medium transition",
                            paintMode === value
                              ? value === "BREAK"
                                ? "bg-blue-500 text-white"
                                : "bg-green-500 text-white"
                              : "bg-background hover:bg-muted",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => setPaintMode("ERASE")}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                        paintMode === "ERASE"
                          ? "border-destructive bg-destructive text-white"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      Effacer
                    </button>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {paintMode === "ERASE"
                      ? "Cliquez un bloc pour le supprimer."
                      : canUpdate
                        ? "Cliquez-glissez sur une ligne vide pour tracer · glissez un bloc pour le déplacer · tirez les bords pour redimensionner."
                        : "Cliquez-glissez sur une ligne pour tracer un créneau."}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-4 rounded bg-green-500" />
                  Travail
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-4 rounded bg-blue-500" />
                  Pause
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-4 rounded border-2 border-dashed border-green-600 bg-green-500/30" />
                  Modèle hebdo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-4 rounded bg-muted" />
                  Libre
                </span>
              </div>

              <PlanningGrid
                day={selectedDay}
                employees={gridEmployees}
                shifts={calendarShifts}
                recurringPatterns={dayRecurringPatterns}
                weeklyWorkedMinutes={weeklyWorkedMinutes}
                mode={paintMode}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onCreate={(seg) => paintShift.mutate(seg)}
                onUpdate={(id, update) => gridUpdateShift.mutate({ id, update })}
                onDelete={(id) => eraseShift.mutate(id)}
              />
            </section>
          ) : (
            <div className="space-y-10">
              {/* ---------- Modèles hebdomadaires récurrents ---------- */}
          <section>
            <h2 className="mb-1 text-lg font-semibold">
              Modèles hebdomadaires
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Horaires types répétés chaque semaine. Servez-vous du bouton
              « Générer » pour créer les créneaux d’une semaine.
            </p>

            {canCreate ? (
              <form
                className="mb-4 grid max-w-3xl gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  createRecurring.mutate();
                }}
              >
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Employé *
                  </label>
                  <select
                    value={recEmployeeId}
                    onChange={(e) => setRecEmployeeId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Choisir —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {employeeDisplayName(emp)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Jour</label>
                  <select
                    value={recDay}
                    onChange={(e) => setRecDay(e.target.value as WeekDayDto)}
                    className={inputCls}
                  >
                    {WEEK_DAY_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Type</label>
                  <select
                    value={recKind}
                    onChange={(e) =>
                      setRecKind(e.target.value as WorkShiftKindDto)
                    }
                    className={inputCls}
                  >
                    {WORK_SHIFT_KIND_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Début</label>
                  <input
                    type="time"
                    value={recStart}
                    onChange={(e) => setRecStart(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Fin</label>
                  <input
                    type="time"
                    value={recEnd}
                    onChange={(e) => setRecEnd(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-4">
                  <label className="mb-1 block text-sm font-medium">Note</label>
                  <input
                    value={recNote}
                    onChange={(e) => setRecNote(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={createRecurring.isPending}
                  >
                    Ajouter
                  </Button>
                </div>
                {recError ? (
                  <p className="text-sm text-destructive sm:col-span-5">
                    {recError}
                  </p>
                ) : null}
              </form>
            ) : null}

            {recurring.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun modèle défini.
              </p>
            ) : (
              <TableScroll>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 font-semibold">Employé</th>
                      <th className="px-3 py-2 font-semibold">Jour</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Horaire</th>
                      <th className="px-3 py-2 font-semibold">Actif</th>
                      <th className="px-3 py-2 font-semibold">Note</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurring.map((r) =>
                      editRecId === r.id ? (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="px-3 py-2 font-medium">
                            {employeeDisplayName(r.employee)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editRecDay}
                              onChange={(e) =>
                                setEditRecDay(e.target.value as WeekDayDto)
                              }
                              className={inputCls}
                            >
                              {WEEK_DAY_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editRecKind}
                              onChange={(e) =>
                                setEditRecKind(e.target.value as WorkShiftKindDto)
                              }
                              className={inputCls}
                            >
                              {WORK_SHIFT_KIND_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <input
                                type="time"
                                value={editRecStart}
                                onChange={(e) => setEditRecStart(e.target.value)}
                                className={inputCls}
                              />
                              <input
                                type="time"
                                value={editRecEnd}
                                onChange={(e) => setEditRecEnd(e.target.value)}
                                className={inputCls}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">—</td>
                          <td className="px-3 py-2">
                            <input
                              value={editRecNote}
                              onChange={(e) => setEditRecNote(e.target.value)}
                              className={inputCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-xs font-medium text-green-700 hover:underline"
                                onClick={() => updateRecurring.mutate(r.id)}
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:underline"
                                onClick={() => setEditRecId(null)}
                              >
                                Annuler
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="px-3 py-2 font-medium">
                            {employeeDisplayName(r.employee)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {WEEK_DAY_LABEL[r.dayOfWeek]}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                r.kind === "BREAK" ? "secondary" : "default"
                              }
                            >
                              {WORK_SHIFT_KIND_LABEL[r.kind]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {minutesToTime(r.startMinute)} –{" "}
                            {minutesToTime(r.endMinute)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={r.active ? "default" : "outline"}>
                              {r.active ? "Oui" : "Non"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.note ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {canUpdate ? (
                                <>
                                  <button
                                    type="button"
                                    className="text-xs font-medium text-orange-700 hover:underline"
                                    onClick={() => beginEditRecurring(r)}
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:underline"
                                    onClick={() =>
                                      toggleRecurring.mutate({
                                        id: r.id,
                                        active: !r.active,
                                      })
                                    }
                                  >
                                    {r.active ? "Désactiver" : "Activer"}
                                  </button>
                                </>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  className="text-xs text-destructive hover:underline"
                                  onClick={() => {
                                    if (window.confirm("Supprimer ce modèle ?")) {
                                      deleteRecurring.mutate(r.id);
                                    }
                                  }}
                                >
                                  Supprimer
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </TableScroll>
            )}

            {canCreate ? (
              <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-muted/20 p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Semaine (lundi)
                  </label>
                  <input
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="h-9 rounded-lg border border-input px-2 text-sm"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={generateWeek.isPending}
                  onClick={() => generateWeek.mutate()}
                >
                  Générer la semaine
                </Button>
                {generateInfo ? (
                  <p className="text-sm text-muted-foreground">{generateInfo}</p>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* ---------- Créneaux concrets ---------- */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">Créneaux planifiés</h2>

            {canCreate ? (
              <form
                className="mb-6 grid max-w-2xl gap-3 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  createShift.mutate();
                }}
              >
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Employé *
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">— Choisir —</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {employeeDisplayName(emp)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Début *</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Fin *</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Statut</label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as WorkShiftStatusDto)
                    }
                    className={inputCls}
                  >
                    {WORK_SHIFT_STATUS_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Note</label>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={createShift.isPending}>
                    Ajouter au planning
                  </Button>
                </div>
                {formError ? (
                  <p className="text-sm text-destructive sm:col-span-2">
                    {formError}
                  </p>
                ) : null}
              </form>
            ) : null}

            {isError ? (
              <p className="text-sm text-destructive">Chargement impossible.</p>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : shifts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun créneau planifié.
              </p>
            ) : (
              <TableScroll>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 font-semibold">Employé</th>
                      <th className="px-3 py-2 font-semibold">Début</th>
                      <th className="px-3 py-2 font-semibold">Fin</th>
                      <th className="px-3 py-2 font-semibold">Statut</th>
                      <th className="px-3 py-2 font-semibold">Note</th>
                      <th className="px-3 py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) =>
                      editId === s.id ? (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="px-3 py-2 font-medium">
                            {employeeDisplayName(s.employee)}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="datetime-local"
                              value={editStart}
                              onChange={(e) => setEditStart(e.target.value)}
                              className={inputCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="datetime-local"
                              value={editEnd}
                              onChange={(e) => setEditEnd(e.target.value)}
                              className={inputCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={editStatus}
                              onChange={(e) =>
                                setEditStatus(
                                  e.target.value as WorkShiftStatusDto,
                                )
                              }
                              className={inputCls}
                            >
                              {WORK_SHIFT_STATUS_OPTIONS.map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              className={inputCls}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="text-xs font-medium text-green-700 hover:underline"
                                onClick={() => updateShift.mutate(s.id)}
                              >
                                Enregistrer
                              </button>
                              <button
                                type="button"
                                className="text-xs text-muted-foreground hover:underline"
                                onClick={() => setEditId(null)}
                              >
                                Annuler
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr key={s.id} className="border-b border-border/60">
                          <td className="px-3 py-2 font-medium">
                            {employeeDisplayName(s.employee)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDateTime(s.startAt)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDateTime(s.endAt)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                s.status === "CONFIRMED"
                                  ? "default"
                                  : s.status === "PLANNED"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {WORK_SHIFT_STATUS_LABEL[s.status]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {s.note ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-2">
                              {canUpdate ? (
                                <button
                                  type="button"
                                  className="text-xs font-medium text-orange-700 hover:underline"
                                  onClick={() => beginEditShift(s)}
                                >
                                  Modifier
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  className="text-xs text-destructive hover:underline"
                                  onClick={() => {
                                    if (
                                      window.confirm("Supprimer ce créneau ?")
                                    ) {
                                      deleteShift.mutate(s.id);
                                    }
                                  }}
                                >
                                  Supprimer
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </TableScroll>
            )}
            {meta ? (
              <ListPagination
                meta={meta}
                onPageChange={setPage}
                className="mt-4"
              />
            ) : null}
          </section>
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
