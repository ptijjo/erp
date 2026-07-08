"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dateInputToIso } from "../_lib/date-input";
import { fetchHrAllItems } from "../_lib/hr-list";
import { EMPLOYEE_STATUS_OPTIONS } from "../_lib/hr-labels";
import { api } from "~/lib/api";
import type {
  DepartmentDto,
  EmployeeDto,
  OrganizationDto,
  UserListItemDto,
} from "~/lib/api-types";
import { apiErrorMessage } from "~/lib/api-error-message";
import {
  hasMePermission,
  isMainOrganization,
  useMe,
} from "~/hooks/use-me";

const schema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").max(80),
  lastName: z.string().trim().min(1, "Nom requis").max(80),
  email: z.string().trim().email("Email invalide").or(z.literal("")).optional(),
  phone: z.string().trim().max(40).optional(),
  position: z.string().trim().max(120).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"]),
  hireDate: z.string().min(1, "Date d’embauche requise"),
  terminationDate: z.string().optional(),
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  userId: z.string().optional(),
});

type Schema = z.infer<typeof schema>;

export function AddEmployeeForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isPending: mePending } = useMe();
  const canCreate =
    me != null && hasMePermission(me, "create", "Employee");
  const isMain = me != null && isMainOrganization(me);
  const canReadUser = me != null && hasMePermission(me, "read", "User");

  const { data: organisations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ["organisation"] as const,
    queryFn: async () => {
      const { data } = await api.get<OrganizationDto[]>("/organisation");
      return data;
    },
    enabled: isMain,
  });

  const { data: departments = [], isLoading: depsLoading } = useQuery({
    queryKey: ["hr", "departments", "picker"] as const,
    queryFn: () => fetchHrAllItems<DepartmentDto>("/hr/departments"),
    enabled: canCreate,
  });

  const { data: employees = [], isLoading: empLoading } = useQuery({
    queryKey: ["hr", "employees", "picker"] as const,
    queryFn: () => fetchHrAllItems<EmployeeDto>("/hr/employees"),
    enabled: canCreate,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["user"] as const,
    queryFn: async () => {
      const { data } = await api.get<UserListItemDto[]>("/user");
      return data;
    },
    enabled: canCreate && canReadUser,
  });

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Schema>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      position: "",
      status: "ACTIVE",
      hireDate: new Date().toISOString().slice(0, 10),
      terminationDate: "",
      organizationId: "",
      departmentId: "",
      managerId: "",
      userId: "",
    },
  });

  const organizationId = watch("organizationId");

  const departmentsForOrg = useMemo(() => {
    const orgId = isMain ? organizationId : me?.organisationId;
    if (!orgId) return departments;
    return departments.filter((d) => d.organizationId === orgId);
  }, [departments, organizationId, isMain, me?.organisationId]);

  const employeesForOrg = useMemo(() => {
    const orgId = isMain ? organizationId : me?.organisationId;
    if (!orgId) return employees;
    return employees.filter((e) => e.organizationId === orgId);
  }, [employees, organizationId, isMain, me?.organisationId]);

  const createMutation = useMutation({
    mutationFn: async (data: Schema) => {
      const payload: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status,
        hireDate: dateInputToIso(data.hireDate),
      };
      if (data.email?.trim()) payload.email = data.email.trim();
      if (data.phone?.trim()) payload.phone = data.phone.trim();
      if (data.position?.trim()) payload.position = data.position.trim();
      if (data.terminationDate?.trim()) {
        payload.terminationDate = dateInputToIso(data.terminationDate);
      }
      if (isMain && data.organizationId) {
        payload.organizationId = data.organizationId;
      }
      if (data.departmentId) payload.departmentId = data.departmentId;
      if (data.managerId) payload.managerId = data.managerId;
      if (data.userId) payload.userId = data.userId;
      await api.post("/hr/employees", payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr"] });
      router.push("/dashboard/rh/employes");
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible de créer l’employé"),
      });
    },
  });

  if (mePending) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!canCreate) {
    return (
      <p className="text-sm text-amber-800" role="alert">
        Accès refusé — permission « créer employé » requise.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((d) => createMutation.mutate(d))}
      className="flex max-w-xl flex-col gap-4"
    >
      {errors.root ? (
        <p className="text-sm text-destructive" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="emp-first" className="mb-1 block text-sm font-medium">
            Prénom <span className="text-destructive">*</span>
          </label>
          <input
            id="emp-first"
            {...register("firstName")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
          {errors.firstName ? (
            <p className="mt-1 text-sm text-destructive">{errors.firstName.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="emp-last" className="mb-1 block text-sm font-medium">
            Nom <span className="text-destructive">*</span>
          </label>
          <input
            id="emp-last"
            {...register("lastName")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
          {errors.lastName ? (
            <p className="mt-1 text-sm text-destructive">{errors.lastName.message}</p>
          ) : null}
        </div>
      </div>

      {isMain ? (
        <div>
          <label htmlFor="emp-org" className="mb-1 block text-sm font-medium">
            Organisation
          </label>
          <select
            id="emp-org"
            {...register("organizationId")}
            disabled={orgsLoading}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">— Organisation du compte —</option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="emp-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="emp-email"
            type="email"
            {...register("email")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Si l’email correspond à un compte utilisateur de la même organisation,
            la fiche employé sera liée automatiquement.
          </p>
        </div>
        <div>
          <label htmlFor="emp-phone" className="mb-1 block text-sm font-medium">
            Téléphone
          </label>
          <input
            id="emp-phone"
            {...register("phone")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="emp-position" className="mb-1 block text-sm font-medium">
          Poste
        </label>
        <input
          id="emp-position"
          {...register("position")}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="emp-status" className="mb-1 block text-sm font-medium">
            Statut
          </label>
          <select
            id="emp-status"
            {...register("status")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {EMPLOYEE_STATUS_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="emp-dept" className="mb-1 block text-sm font-medium">
            Département
          </label>
          <select
            id="emp-dept"
            {...register("departmentId")}
            disabled={depsLoading}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">— Aucun —</option>
            {departmentsForOrg.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="emp-manager" className="mb-1 block text-sm font-medium">
          Manager
        </label>
        <select
          id="emp-manager"
          {...register("managerId")}
          disabled={empLoading}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">— Aucun —</option>
          {employeesForOrg.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
      </div>

      {canReadUser ? (
        <div>
          <label htmlFor="emp-user" className="mb-1 block text-sm font-medium">
            Compte utilisateur lié (optionnel)
          </label>
          <select
            id="emp-user"
            {...register("userId")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">— Liaison auto par email —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">
            Laissez vide pour lier via l’email, ou choisissez un compte manuellement.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="emp-hire" className="mb-1 block text-sm font-medium">
            Date d’embauche <span className="text-destructive">*</span>
          </label>
          <input
            id="emp-hire"
            type="date"
            {...register("hireDate")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
          {errors.hireDate ? (
            <p className="mt-1 text-sm text-destructive">{errors.hireDate.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="emp-term" className="mb-1 block text-sm font-medium">
            Date de sortie
          </label>
          <input
            id="emp-term"
            type="date"
            {...register("terminationDate")}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || createMutation.isPending}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
        >
          {isSubmitting ? "Création…" : "Créer l’employé"}
        </button>
        <Link
          href="/dashboard/rh/employes"
          className="rounded-lg border border-input px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
