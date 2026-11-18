import type { UserSummary } from './users/types';

export type OperationalSession = { token: string; user: UserSummary };

export function isCurrentAdministrator(token: string | undefined, session: OperationalSession | null): boolean {
  return Boolean(token && session && session.token === token && session.user.enabled && session.user.role === 'ADMIN');
}
