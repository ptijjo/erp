"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dateInputToIso, isoToDateInput } from "../_lib/date-input";
import { fetchHrAllItems } from "../_lib/hr-list";
import { EMPLOYEE_STATUS_OPTIONS } from "../_lib/hr-labels";
import { api } from "~/lib/api";
import type {
  DepartmentDto,
  EmployeeDto,
  PaginatedResponse,
  UserListItemDto,
} from "~/lib/api-types";
import { extractApiList, FULL_LIST_QUERY } from "~/lib/api-list";
import { apiErrorMessage } from "~/lib/api-error-message";
import { hasMePermission, useMe } from "~/hooks/use-me";

const schema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().or(z.literal("")),
  phone: z.string().trim().max(40),
  position: z.string().trim().max(120),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"]),
  hireDate: z.string().min(1),
  terminationDate: z.string(),
  departmentId: z.string(),
  managerId: z.string(),
  userId: z.string(),
});

type Schema = z.infer<typeof schema>;

type Props = { employeeId: string };

export function EditEmployeeForm({ employeeId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const canUpdate =
    me != null && hasMePermission(me, "update", "Employee");
  const canReadUser = me != null && hasMePermission(me, "read", "User");

  const { data: employee, isLoading } = useQuery({
    queryKey: ["hr", "employees", employeeId] as const,
    queryFn: async () => {
      const { data } = await api.get<EmployeeDto>(`/hr/employees/${employeeId}`);
      return data;
    },
    enabled: Boolean(employeeId),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hr", "departments", "picker"] as const,
    queryFn: () => fetchHrAllItems<DepartmentDto>("/hr/departments"),
    enabled: canUpdate,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["hr", "employees", "picker"] as const,
    queryFn: () => fetchHrAllItems<EmployeeDto>("/hr/employees"),
    enabled: canUpdate,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["user"] as const,
    queryFn: async () => {
      const { data } = await api.get<
        UserListItemDto[] | PaginatedResponse<UserListItemDto>
      >("/user", FULL_LIST_QUERY);
      return extractApiList(data);
    },
    enabled: canReadUser,
  });

  const departmentsForOrg = useMemo(
    () =>
      employee
        ? departments.filter((d) => d.organizationId === employee.organizationId)
        : [],
    [departments, employee],
  );

  const managers = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.organizationId === employee?.organizationId && e.id !== employeeId,
      ),
    [employees, employee, employeeId],
  );

  const {
    register,
    handleSubmit,
    reset,
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
      hireDate: "",
      terminationDate: "",
      departmentId: "",
      managerId: "",
      userId: "",
    },
  });

  useEffect(() => {
    if (!employee) return;
    reset({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      position: employee.position ?? "",
      status: employee.status,
      hireDate: isoToDateInput(employee.hireDate),
      terminationDate: employee.terminationDate
        ? isoToDateInput(employee.terminationDate)
        : "",
      departmentId: employee.departmentId ?? "",
      managerId: employee.managerId ?? "",
      userId: employee.userId ?? "",
    });
  }, [employee, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: Schema) => {
      await api.patch(`/hr/employees/${employeeId}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.trim() || null,
        phone: data.phone.trim() || null,
        position: data.position.trim() || null,
        status: data.status,
        hireDate: dateInputToIso(data.hireDate),
        terminationDate: data.terminationDate.trim()
          ? dateInputToIso(data.terminationDate)
          : null,
        departmentId: data.departmentId || null,
        managerId: data.managerId || null,
        userId: data.userId || null,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hr"] });
      router.push(`/dashboard/rh/employes/${employeeId}`);
    },
    onError: (err) => {
      setError("root", {
        message: apiErrorMessage(err, "Impossible d’enregistrer"),
      });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  if (!canUpdate) {
    return (
      <p className="text-sm text-amber-800" role="alert">
        Accès refusé.
      </p>
    );
  }

  if (!employee) {
    return <p className="text-sm text-destructive">Employé introuvable.</p>;
  }

  return (
    <form
      onSubmit={handleSubmit((d) => updateMutation.mutate(d))}
      className="flex max-w-xl flex-col gap-4"
    >
      {errors.root ? (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Prénom *</label>
          <input
            {...register("firstName")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nom *</label>
          <input
            {...register("lastName")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            {...register("email")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Modifier l’email peut relier ou délier le compte utilisateur correspondant.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Téléphone</label>
          <input
            {...register("phone")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Poste</label>
        <input
          {...register("position")}
          className="h-10 w-full rounded-lg border border-input px-3 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Statut</label>
          <select
            {...register("status")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          >
            {EMPLOYEE_STATUS_OPTIONS.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Département</label>
          <select
            {...register("departmentId")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
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
        <label className="mb-1 block text-sm font-medium">Manager</label>
        <select
          {...register("managerId")}
          className="h-10 w-full rounded-lg border border-input px-3 text-sm"
        >
          <option value="">— Aucun —</option>
          {managers.map((e) => (
            <option key={e.id} value={e.id}>
              {e.firstName} {e.lastName}
            </option>
          ))}
        </select>
      </div>

      {canReadUser ? (
        <div>
          <label className="mb-1 block text-sm font-medium">
            Compte utilisateur
          </label>
          <select
            {...register("userId")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          >
            <option value="">— Liaison auto par email —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Date d’embauche *
          </label>
          <input
            type="date"
            {...register("hireDate")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Date de sortie</label>
          <input
            type="date"
            {...register("terminationDate")}
            className="h-10 w-full rounded-lg border border-input px-3 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enregistrer
        </button>
        <Link
          href={`/dashboard/rh/employes/${employeeId}`}
          className="rounded-lg border border-input px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
