export type RegistrationDraft = { displayName: string; type: 'PERSON' | 'COMPANY'; phone: string };
export type AdminRegistrationDraft = RegistrationDraft & { email: string };
export type PendingRegistration = { id: string; createdAt: string; customer: { displayName: string; type: 'PERSON' | 'COMPANY'; email: string; phone: string | null } };
export type PendingPage = { items: PendingRegistration[]; page: number; totalPages: number; total: number };
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string }) => Promise<T>;

export function createRegistrationsSource(request: Request) {
  return {
    register: (draft: RegistrationDraft, signal: AbortSignal) => request<{ status: 'pending' }>('/api/customer-registrations', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: draft.displayName, type: draft.type, phone: draft.phone }),
    }),
    claimInvitation: (code: string, signal: AbortSignal) => request<{ status: 'linked' }>('/api/user-invitations/claim/redeem', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
    }),
    registerByAdmin: (draft: AdminRegistrationDraft, signal: AbortSignal) => request<{ id: string }>('/api/customer-registrations/admin', {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: draft.displayName, type: draft.type, phone: draft.phone, email: draft.email }),
    }),
    list: (page: number, signal: AbortSignal) => request<PendingPage>(`/api/customer-registrations/pending?page=${page}`, { signal }),
    approve: (id: string, signal: AbortSignal) => request<{ status: 'approved' }>(`/api/customer-registrations/${encodeURIComponent(id)}/approve`, { method: 'PATCH', signal }),
  };
}
export type RegistrationsSource = ReturnType<typeof createRegistrationsSource>;
