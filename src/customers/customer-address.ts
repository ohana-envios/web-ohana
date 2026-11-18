import type { CustomerAddress, CustomerAddressDraft } from './types';

export const addressFieldLimits = { label: 80, street: 160, number: 30, locality: 80, department: 80, reference: 240, notes: 500 } as const;
export type AddressErrors = Partial<Record<keyof CustomerAddressDraft, string>>;
type AddressData = Omit<CustomerAddress, 'id' | 'active'>;
type Validation = { valid: true; data: AddressData } | { valid: false; errors: AddressErrors };

export function isAddressActive(address: Pick<CustomerAddress, 'id' | 'active'>, inactiveIds: readonly string[]): boolean {
  return address.active ?? !inactiveIds.includes(address.id);
}

export function validateCustomerAddress(draft: CustomerAddressDraft): Validation {
  const errors: AddressErrors = {};
  const values: CustomerAddressDraft = { label: '', street: '', number: '', locality: '', department: '', reference: '', notes: '' };
  for (const field of Object.keys(addressFieldLimits) as (keyof CustomerAddressDraft)[]) {
    if (typeof draft[field] !== 'string') errors[field] = 'Ingresá un texto válido.';
    else values[field] = draft[field].trim();
    if (values[field].length > addressFieldLimits[field]) errors[field] = `Admite hasta ${addressFieldLimits[field]} caracteres.`;
  }
  for (const field of ['street', 'number', 'locality', 'department'] as const) {
    if (!errors[field] && !values[field]) errors[field] = 'Completá este campo obligatorio.';
  }
  if (Object.keys(errors).length) return { valid: false, errors };
  return { valid: true, data: {
    label: values.label || null, street: values.street, number: values.number,
    locality: values.locality, department: values.department,
    reference: values.reference || null, notes: values.notes || null,
  } };
}

export function hasDuplicateAddress(addresses: CustomerAddress[], draft: CustomerAddressDraft, excludeId?: string): boolean {
  const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  const locationFields = ['street', 'number', 'locality', 'department'] as const;
  if (locationFields.some((field) => !draft[field].trim())) return false;
  return addresses.some((address) => address.id !== excludeId && locationFields.every((field) => normalize(address[field]) === normalize(draft[field])));
}
