type UserNameFields = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export function userDisplayName(user: UserNameFields): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  const local = user.email.split("@")[0];
  return local && local.length > 0 ? local : user.email;
}

export function userInitials(user: UserNameFields): string {
  const first = user.firstName?.trim();
  const last = user.lastName?.trim();
  if (first && last) {
    return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
  }
  if (first && first.length >= 2) return first.slice(0, 2).toUpperCase();
  if (first) return first[0]!.toUpperCase();
  const local = user.email.split("@")[0] ?? "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local[0]?.toUpperCase() ?? "?";
}
