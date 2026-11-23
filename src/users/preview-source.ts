import { userRoles } from './types.ts';
import type { UsersSource, UserSummary, UserAccessDraft } from './types';

// Fictional records for the standalone development preview; no real access grants.
const users: UserSummary[] = [
  { id: 'demo-user-admin', displayName: 'Administración de prueba', email: 'admin@example.invalid', role: 'ADMIN', enabled: true },
  { id: 'demo-user-operator1', displayName: 'Operador de ejemplo', email: 'operador1@example.invalid', role: 'OPERATOR', enabled: true },
  { id: 'demo-user-operator2', displayName: 'Operadora de ejemplo', email: 'operador2@example.invalid', role: 'OPERATOR', enabled: false },
  { id: 'demo-user-customer1', displayName: 'Cliente de ejemplo', email: 'cliente@example.invalid', role: 'CUSTOMER', enabled: true },
  { id: 'demo-user-customer2', displayName: 'Cliente sin acceso de ejemplo', email: 'cliente2@example.invalid', role: 'CUSTOMER', enabled: false },
  { id: 'demo-user-courier', displayName: 'Repartidora de ejemplo', email: 'cadete@example.invalid', role: 'COURIER', enabled: true },
];

export function createPreviewUsersSource(): UsersSource & Required<Pick<UsersSource, 'updateAccess'>> {
 const records = users.map((user) => ({ ...user }));
 return {
  async list(query, signal) {
    if (signal.aborted) { const error = new Error('Operación cancelada'); error.name = 'AbortError'; throw error; }
    const search = query.search.trim().toLocaleLowerCase('es');
    const filtered = records.filter((user) => {
      if (query.role !== 'all' && user.role !== query.role) return false;
      if (query.status !== 'all' && user.enabled !== (query.status === 'enabled')) return false;
      return [user.displayName, user.email].some((field) => field.toLocaleLowerCase('es').includes(search));
    }).sort((left, right) => left.displayName.localeCompare(right.displayName, 'es') || left.id.localeCompare(right.id));
    const offset = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(offset, offset + query.pageSize).map((user) => ({ ...user })),
      page: query.page, pageSize: query.pageSize, total: filtered.length, totalPages: Math.ceil(filtered.length / query.pageSize),
    };
  },
  async updateAccess(id, draft, signal) {
    if (signal.aborted) { const error = new Error('Operación cancelada'); error.name = 'AbortError'; throw error; }
    if (!draft || !userRoles.includes(draft.role) || typeof draft.enabled !== 'boolean') throw new Error('Elegí un rol y un estado de acceso válidos.');
    const actor = records.find((user) => user.id === 'demo-user-admin');
    if (!actor?.enabled || actor.role !== 'ADMIN') throw new Error('Se requiere una cuenta administradora habilitada.');
    const user = records.find((item) => item.id === id);
    if (!user) throw new Error('Usuario de prueba no encontrado.');
    const previous: UserAccessDraft = { role: user.role, enabled: user.enabled };
    const next: UserAccessDraft = { role: draft.role, enabled: draft.enabled };
    if (previous.role === next.role && previous.enabled === next.enabled) return { user: { ...user }, previewAudit: null };
    // Conservative preview policy: keep the simulated administrator able to operate.
    if (user.id === actor.id && (next.role !== 'ADMIN' || !next.enabled)) throw new Error('No podés quitar tu propio acceso de administración desde esta vista.');
    Object.assign(user, next);
    return { user: { ...user }, previewAudit: { actorId: actor.id, occurredAt: new Date().toISOString(), previous, next } };
  },
 };
}

export const previewUsersSource = createPreviewUsersSource();
