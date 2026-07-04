"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChartGantt, LayoutGrid, ListChecks, Plus, Table2 } from "lucide-react";

import {
  CreateTaskPanel,
  defaultDueForGroup,
} from "~/app/dashboard/mes-actions/_components/CreateTaskPanel";
import { ActionsGanttView } from "~/app/dashboard/mes-actions/_components/ActionsGanttView";
import { ActionsKanbanView } from "~/app/dashboard/mes-actions/_components/ActionsKanbanView";
import { ActionsTableView } from "~/app/dashboard/mes-actions/_components/ActionsTableView";
import {
  groupActions,
  type ActionGroupId,
  type BoardView,
} from "~/app/dashboard/mes-actions/_lib/action-board";
import { TASK_SCOPE_LABEL } from "~/app/dashboard/mes-actions/_lib/action-labels";
import { PageHeader } from "~/components/layout/page-header";
import { PageShell } from "~/components/layout/page-shell";
import { Button } from "~/components/ui/button";
import { hasMePermission, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import type {
  ActionItemDto,
  TaskPriorityDto,
  TaskScopeDto,
  TaskStatusDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import { cn } from "~/lib/utils";
import { useScopedOrganizations } from "~/lib/use-scoped-organizations";

const SCOPE_OPTIONS = Object.entries(TASK_SCOPE_LABEL) as [
  TaskScopeDto,
  string,
][];

const VIEW_TABS: { id: BoardView; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Tableau principal", icon: Table2 },
  { id: "gantt", label: "Gantt", icon: ChartGantt },
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
];

export default function MesActionsPage() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { main, selectableOrgs, defaultOrganizationId } =
    useScopedOrganizations();

  const canRead = me != null && hasMePermission(me, "read", "Task");
  const canCreate = me != null && hasMePermission(me, "create", "Task");
  const canUpdate = me != null && hasMePermission(me, "update", "Task");
  const canDelete = me != null && hasMePermission(me, "delete", "Task");

  const [view, setView] = useState<BoardView>("table");
  const [showForm, setShowForm] = useState(false);
  const [presetGroup, setPresetGroup] = useState<ActionGroupId | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriorityDto>("NORMAL");
  const [scope, setScope] = useState<TaskScopeDto>("USER");
  const [organizationId, setOrganizationId] = useState("");
  const [poleCode, setPoleCode] = useState("");

  const formOrganizationId = organizationId || defaultOrganizationId;

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["actions"] as const,
    queryFn: async () => {
      const { data } = await api.get<ActionItemDto[]>("/actions");
      return data;
    },
    enabled: canRead,
  });

  const { data: poles = [] } = useQuery({
    queryKey: ["poles"] as const,
    queryFn: async () => {
      const { data } = await api.get<
        { id: string; code: string; name: string }[]
      >("/poles");
      return data;
    },
    enabled: canRead && main,
  });

  const groups = useMemo(() => groupActions(actions), [actions]);

  const stats = useMemo(() => {
    const todo = actions.filter((a) => a.status === "TODO").length;
    const inProgress = actions.filter((a) => a.status === "IN_PROGRESS").length;
    const done = actions.filter((a) => a.status === "DONE").length;
    return { todo, inProgress, done, total: actions.length };
  }, [actions]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("NORMAL");
    setScope("USER");
    setOrganizationId("");
    setPoleCode("");
    setPresetGroup(null);
    setShowForm(false);
  };

  const openCreateForm = (groupId?: ActionGroupId) => {
    setPresetGroup(groupId ?? null);
    setDueDate(defaultDueForGroup(groupId ?? null));
    setShowForm(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const orgId = main ? formOrganizationId : me!.organisationId;
      await api.post("/actions", {
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate: dueDate || undefined,
        priority,
        scope,
        organizationId: orgId,
        poleCode:
          scope === "POLE" && poleCode.trim() ? poleCode.trim() : undefined,
      });
    },
    onSuccess: async () => {
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Création impossible"));
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: TaskStatusDto;
    }) => {
      await api.patch(`/actions/${id}`, { status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Mise à jour impossible"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/actions/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (e) => {
      alert(apiErrorMessage(e, "Suppression impossible"));
    },
  });

  if (!canRead) {
    return (
      <PageShell>
        <PageHeader
          title="Mes actions"
          description="Vous n'avez pas accès à l'agenda des actions."
        />
      </PageShell>
    );
  }

  const scopeOptions = main
    ? SCOPE_OPTIONS
    : SCOPE_OPTIONS.filter(([value]) => value !== "POLE");

  return (
    <PageShell className="max-w-[1400px]">
      <PageHeader
        title="Mes actions"
        description="Demandes, approbations et tâches — vue consolidée de votre activité."
        actions={
          canCreate ? (
            <Button type="button" onClick={() => openCreateForm()}>
              <Plus className="mr-2 size-4" />
              Nouvelle tâche
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="bg-muted/40 inline-flex rounded-lg border p-0.5">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
          <span>
            <strong className="text-foreground">{stats.total}</strong> au total
          </span>
          <span className="text-orange-700">
            {stats.todo} en attente
          </span>
          <span className="text-amber-700">
            {stats.inProgress} en cours
          </span>
          <span className="text-emerald-700">{stats.done} faites</span>
        </div>
      </div>

      <CreateTaskPanel
        open={showForm}
        title={title}
        description={description}
        dueDate={dueDate}
        priority={priority}
        scope={scope}
        poleCode={poleCode}
        organizationId={organizationId}
        defaultOrganizationId={defaultOrganizationId}
        main={main}
        selectableOrgs={selectableOrgs}
        scopeOptions={scopeOptions}
        poles={poles}
        pending={createMutation.isPending}
        presetGroup={presetGroup}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onDueDateChange={setDueDate}
        onPriorityChange={setPriority}
        onScopeChange={setScope}
        onPoleCodeChange={setPoleCode}
        onOrganizationChange={setOrganizationId}
        onSubmit={() => createMutation.mutate()}
        onCancel={resetForm}
      />

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : actions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ListChecks className="text-muted-foreground size-12" />
          <p className="font-medium">Aucune action pour le moment</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Les alertes ERP et vos tâches apparaîtront ici, groupées par échéance.
          </p>
          {canCreate && (
            <Button type="button" variant="outline" onClick={() => openCreateForm()}>
              <Plus className="mr-2 size-4" />
              Ajouter une tâche
            </Button>
          )}
        </div>
      ) : view === "table" ? (
        <ActionsTableView
          groups={groups}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
          onAddTask={(groupId) => openCreateForm(groupId)}
          onStatusChange={(id, status) =>
            updateStatusMutation.mutate({ id, status })
          }
          onDelete={(id) => {
            if (window.confirm("Supprimer cette tâche ?")) {
              deleteMutation.mutate(id);
            }
          }}
        />
      ) : view === "gantt" ? (
        <ActionsGanttView actions={actions} />
      ) : (
        <ActionsKanbanView
          actions={actions}
          canUpdate={canUpdate}
          onStatusChange={(id, status) =>
            updateStatusMutation.mutate({ id, status })
          }
        />
      )}
    </PageShell>
  );
}
