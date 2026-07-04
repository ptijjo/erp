"use client";

import { UserProfileAvatar } from "~/app/dashboard/utilisateurs/_components/UserProfileAvatar";
import { userDisplayName } from "~/app/dashboard/utilisateurs/_lib/user-display";
import type { StockOrderDto } from "~/lib/api-types";

type StockOrderRequesterCellProps = {
  requester: StockOrderDto["requestedBy"];
};

export function StockOrderRequesterCell({
  requester,
}: StockOrderRequesterCellProps) {
  if (!requester) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-[140px] items-center gap-2">
      <UserProfileAvatar
        email={requester.email}
        firstName={requester.firstName}
        lastName={requester.lastName}
        profilePhotoUrl={requester.profilePhotoUrl}
        size="md"
        className="size-8 shrink-0 ring-1"
      />
      <span className="truncate font-medium text-gray-800">
        {userDisplayName(requester)}
      </span>
    </div>
  );
}
