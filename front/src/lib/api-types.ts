/**
 * Formes minimales des réponses JSON API Nest + Prisma
 * (Decimal → string, Date → ISO).
 */

export type OrganizationDto = {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UserListItemDto = {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string; description: string | null };
  organization: OrganizationDto;
};

export type UserDetailDto = {
  id: string;
  email: string;
  organizationId: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  role: { id: string; name: string; description: string | null };
};

export type VentePaiementDto = {
  id: string;
  modePaiement: string;
  amount: string | number;
};

export type VenteLineListItemDto = {
  id: string;
  productId: string;
  quantity: number;
  product: { id: string; name: string };
};

export type VenteListItemDto = {
  id: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    organizationType: string;
  };
  status: string;
  totalAmount: string | number;
  createdAt: string;
  numeroTicket: number | null;
  user: { email: string } | null;
  paiements: VentePaiementDto[];
  lignes?: VenteLineListItemDto[];
};

export type CategoryDto = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
};

export type ProductDto = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  qrCode: string;
  categoryId: string;
  category: CategoryDto;
};

export type StockDto = {
  id: string;
  quantity: number;
  minQuantity: number;
  maxQuantity: number | null;
  organizationId: string;
  productId: string;
  product: { id: string; name: string; price: string | number };
  organization: { id: string; name: string; slug: string };
};
