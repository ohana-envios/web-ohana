import type { CustomerAddressDraft, CustomerDetail, CustomerList, CustomerListQuery, CustomersSource } from './customers/types';
import type { UserList, UserListQuery, UserSummary, UsersSource } from './users/types';

// The caller provides the authenticated transport; sources never hold or persist credentials.
type Request = <T>(path: string, init: { signal: AbortSignal; method?: string; headers?: Record<string, string>; body?: string }) => Promise<T>;

function queryString(query: CustomerListQuery | UserListQuery): string {
  const values = Object.entries(query).map(([key, value]) => [key, String(value)]);
  return new URLSearchParams(values).toString();
}

function addressFields(draft: CustomerAddressDraft) {
  return { label: draft.label, street: draft.street, number: draft.number, locality: draft.locality,
    department: draft.department, reference: draft.reference, notes: draft.notes };
}

export function createApiCustomersSource(request: Request): CustomersSource {
  return {
    list: (query, signal) => request<CustomerList>(`/api/customers?${queryString(query)}`, { signal }),
    get: (id, signal) => request<CustomerDetail>(`/api/customers/${encodeURIComponent(id)}`, { signal }),
    update: (id, draft, signal, original) => {
      if (!original || original.id !== id) return Promise.reject(new Error('Debe cargar la ficha antes de editarla'));
      return request<CustomerDetail>(`/api/customers/${encodeURIComponent(id)}`, {
        method: 'PATCH', signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: draft.displayName, legalName: draft.legalName, email: draft.email, phone: draft.phone,
          expected: { displayName: original.displayName, legalName: original.legalName, email: original.email, phone: original.phone } }),
      });
    },
    addAddress: (id, draft, signal) => request<CustomerDetail>(`/api/customers/${encodeURIComponent(id)}/addresses`, {
      method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addressFields(draft)),
    }),
    updateAddress: (id, addressId, draft, signal, original) => {
      if (!original || original.id !== addressId) return Promise.reject(new Error('Debe cargar la dirección antes de editarla'));
      const { label, street, number, locality, department, reference, notes } = original;
      return request<CustomerDetail>(`/api/customers/${encodeURIComponent(id)}/addresses/${encodeURIComponent(addressId)}`, {
        method: 'PATCH', signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addressFields(draft), expected: { label, street, number, locality, department, reference, notes } }),
      });
    },
    deactivateAddress: (id, addressId, signal) => request<CustomerDetail>(`/api/customers/${encodeURIComponent(id)}/addresses/${encodeURIComponent(addressId)}/status`, {
      method: 'PATCH', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false }),
    }),
    reactivateAddress: (id, addressId, signal) => request<CustomerDetail>(`/api/customers/${encodeURIComponent(id)}/addresses/${encodeURIComponent(addressId)}/status`, {
      method: 'PATCH', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }),
    }),
  };
}

export function createApiUsersSource(request: Request): UsersSource {
  return {
    list: (query, signal) => request<UserList>(`/api/users?${queryString(query)}`, { signal }),
  };
}

export function getOperationalSession(request: Request, signal: AbortSignal): Promise<UserSummary> {
  return request<UserSummary>('/api/users/me', { signal });
}
