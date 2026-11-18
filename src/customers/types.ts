// Read contract: api-ohana/docs/scrum-21-read-contract.md.
export type CustomerSummary = {
  id: string;
  type: 'PERSON' | 'COMPANY';
  displayName: string;
  legalName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  email: string | null;
  phone: string | null;
  enabled: boolean;
  addressCount: number;
};

export type CustomerAddress = {
  id: string;
  label: string | null;
  street: string;
  number: string;
  locality: string;
  department: string;
  reference: string | null;
  notes: string | null;
  active?: boolean;
};

export type CustomerDetail = CustomerSummary & {
  addresses: CustomerAddress[];
  // Development preview metadata; address status is not part of the API model yet.
  preview?: { inactiveAddressIds: string[] };
};
export type CustomerListQuery = {
  search: string;
  status: 'all' | 'enabled' | 'disabled';
  page: number;
  pageSize: number;
};
export type CustomerList = {
  items: CustomerSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type CustomersSource = {
  inviteCustomer?(id: string, email: string, signal: AbortSignal): Promise<{ code: string; expiresAt: string }>;
  list(query: CustomerListQuery, signal: AbortSignal): Promise<CustomerList>;
  get(id: string, signal: AbortSignal): Promise<CustomerDetail>;
  update?(id: string, draft: CustomerEditDraft, signal: AbortSignal, original?: CustomerDetail): Promise<CustomerDetail>;
  addAddress?(customerId: string, draft: CustomerAddressDraft, signal: AbortSignal): Promise<CustomerDetail>;
  updateAddress?(customerId: string, addressId: string, draft: CustomerAddressDraft, signal: AbortSignal, original?: CustomerAddress): Promise<CustomerDetail>;
  deactivateCustomer?(customerId: string, signal: AbortSignal): Promise<CustomerDetail>;
  deactivateAddress?(customerId: string, addressId: string, signal: AbortSignal): Promise<CustomerDetail>;
  reactivateCustomer?(customerId: string, signal: AbortSignal): Promise<CustomerDetail>;
  reactivateAddress?(customerId: string, addressId: string, signal: AbortSignal): Promise<CustomerDetail>;
};

export type CustomerEditDraft = {
  displayName: string;
  legalName: string;
  email: string;
  phone: string;
};

export type CustomerEditData = {
  displayName: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
};

export type CustomerAddressDraft = {
  label: string;
  street: string;
  number: string;
  locality: string;
  department: string;
  reference: string;
  notes: string;
};
