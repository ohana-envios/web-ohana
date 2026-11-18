export const userRoles = ['ADMIN', 'OPERATOR', 'CUSTOMER', 'COURIER'] as const;
export type UserRole = typeof userRoles[number];
export const userRoleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrador', OPERATOR: 'Operador', CUSTOMER: 'Cliente', COURIER: 'Repartidor',
};

export type UserSummary = { id: string; email: string; displayName: string; role: UserRole; enabled: boolean };
export type UserListQuery = {
  search: string;
  role: 'all' | UserRole;
  status: 'all' | 'enabled' | 'disabled';
  page: number;
  pageSize: number;
};
export type UserList = { items: UserSummary[]; page: number; pageSize: number; total: number; totalPages: number };
export type UserAccessDraft = { role: UserRole; enabled: boolean };
export type UserAccessChange = {
  user: UserSummary;
  // Temporary evidence for development only, not persisted business audit.
  previewAudit: { actorId: string; occurredAt: string; previous: UserAccessDraft; next: UserAccessDraft } | null;
};
export type UsersSource = {
  list(query: UserListQuery, signal: AbortSignal): Promise<UserList>;
  updateAccess?(id: string, draft: UserAccessDraft, signal: AbortSignal): Promise<UserAccessChange>;
};
