import type { CustomerEditData, CustomerEditDraft } from './types';

export type CustomerEditErrors = Partial<Record<keyof CustomerEditDraft, string>>;
type Validation = { valid: true; data: CustomerEditData } | { valid: false; errors: CustomerEditErrors };

export function isCustomerConflict(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'status' in error && error.status === 409);
}

export function validateCustomerEdit(draft: CustomerEditDraft): Validation {
  const errors: CustomerEditErrors = {};
  const values = { displayName: '', legalName: '', email: '', phone: '' };
  for (const field of Object.keys(values) as (keyof CustomerEditDraft)[]) {
    if (typeof draft[field] !== 'string') errors[field] = 'Ingresá un texto válido.';
    else values[field] = draft[field].trim();
  }
  if (!errors.displayName && !values.displayName) errors.displayName = 'Ingresá el nombre del cliente.';
  if (values.displayName.length > 120) errors.displayName = 'El nombre admite hasta 120 caracteres.';
  if (values.legalName.length > 160) errors.legalName = 'La razón social admite hasta 160 caracteres.';
  if (values.email && (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))) {
    errors.email = 'Ingresá un email válido, de hasta 254 caracteres.';
  }
  if (values.phone && (values.phone.length > 40 || !/^[+\d() .-]+$/.test(values.phone) || !/\d/.test(values.phone))) {
    errors.phone = 'Usá números, espacios, +, paréntesis o guiones, hasta 40 caracteres.';
  }
  if (Object.keys(errors).length) return { valid: false, errors };
  return {
    valid: true,
    data: { displayName: values.displayName, legalName: values.legalName || null, email: values.email || null, phone: values.phone || null },
  };
}
