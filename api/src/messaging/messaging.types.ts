export type MessagingContactDto = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profilePhotoUrl: string | null;
  organizationId: string;
  organization: { name: string; organizationType: string };
  role: {
    name: string;
    pole: { code: string; name: string } | null;
  };
  employeeId: string | null;
  position: string | null;
  department: { id: string; name: string } | null;
};
