export type DirectoryEntryDto = {
  employeeId: string | null;
  userId: string | null;
  email: string | null;
  firstName: string;
  lastName: string;
  position: string | null;
  status: 'ACTIVE';
  department: { id: string; name: string } | null;
  organization: { id: string; name: string; slug: string };
  role: {
    name: string;
    pole: { code: string; name: string } | null;
  } | null;
  profilePhotoUrl: string | null;
};
