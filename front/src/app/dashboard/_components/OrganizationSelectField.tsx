"use client";

import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { OrganizationDto } from "~/lib/api-types";

type OrganizationSelectFieldProps = {
  id: string;
  label: string;
  organizations: OrganizationDto[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
};

export function OrganizationSelectField({
  id,
  label,
  organizations,
  value,
  onChange,
  disabled,
}: OrganizationSelectFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} className="mt-1 w-full max-w-md">
          <SelectValue placeholder="Choisir une organisation" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
              {o.organizationType === "MAIN" ? " (maison mère)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
