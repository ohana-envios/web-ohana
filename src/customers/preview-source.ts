import type { CustomerDetail, CustomerSummary, CustomersSource } from './types';
import { validateCustomerEdit } from './customer-edit.ts';
import { validateCustomerAddress } from './customer-address.ts';

// Fictional records, only imported by the standalone development preview.
const customers: CustomerDetail[] = [
  {
    id: 'demo-atelier', type: 'COMPANY', displayName: 'Atelier de ejemplo',
    legalName: 'Atelier Demo', documentType: null, documentNumber: null,
    email: 'contacto@atelier.example.invalid', phone: '099 000 001', enabled: true,
    addressCount: 2,
    addresses: [
      { id: 'demo-address-1', label: 'Local de atención', street: 'Calle de ejemplo', number: '123',
        locality: 'Centro', department: 'Montevideo', reference: 'Entrada por el local', notes: null },
      { id: 'demo-address-2', label: 'Depósito', street: 'Otra calle de ejemplo', number: '456',
        locality: 'Cordón', department: 'Montevideo', reference: null, notes: 'Consultar antes de retirar.' },
    ],
  },
  {
    id: 'demo-libreria', type: 'COMPANY', displayName: 'Librería de ejemplo',
    legalName: null, documentType: null, documentNumber: null,
    email: null, phone: '099 000 002', enabled: true, addressCount: 1,
    addresses: [
      { id: 'demo-address-3', label: null, street: 'Avenida de ejemplo', number: '789',
        locality: 'Parque Rodó', department: 'Montevideo', reference: null, notes: null },
    ],
  },
  {
    id: 'demo-persona', type: 'PERSON', displayName: 'Persona de ejemplo',
    legalName: null, documentType: null, documentNumber: null,
    email: 'persona@example.invalid', phone: null, enabled: false, addressCount: 0, addresses: [],
  },
  {
    id: 'demo-tienda', type: 'COMPANY', displayName: 'Tienda de ejemplo',
    legalName: null, documentType: null, documentNumber: null,
    email: null, phone: null, enabled: false, addressCount: 0, addresses: [],
  },
];

function summary(customer: CustomerDetail): CustomerSummary {
  return {
    id: customer.id, type: customer.type, displayName: customer.displayName,
    legalName: customer.legalName, documentType: customer.documentType, documentNumber: customer.documentNumber,
    email: customer.email, phone: customer.phone, enabled: customer.enabled, addressCount: customer.addressCount,
  };
}

export function createPreviewCustomersSource(): Required<CustomersSource> {
  const records = structuredClone(customers);
  return {
    async list(query, signal) {
      signal.throwIfAborted();
      const search = query.search.trim().toLocaleLowerCase('es');
      const filtered = records.filter((customer) => {
        if (query.status !== 'all' && customer.enabled !== (query.status === 'enabled')) return false;
        return [customer.displayName, customer.legalName, customer.documentNumber, customer.email, customer.phone]
          .some((field) => field?.toLocaleLowerCase('es').includes(search));
      }).sort((left, right) => left.displayName.localeCompare(right.displayName, 'es') || left.id.localeCompare(right.id));
      const offset = (query.page - 1) * query.pageSize;
      return {
        items: filtered.slice(offset, offset + query.pageSize).map(summary),
        page: query.page, pageSize: query.pageSize,
        total: filtered.length, totalPages: Math.ceil(filtered.length / query.pageSize),
      };
    },
    async get(id, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === id);
      if (!customer) throw new Error('Cliente de prueba no encontrado');
      return structuredClone(customer);
    },
    async update(id, draft, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === id);
      if (!customer) throw new Error('Cliente de prueba no encontrado');
      const result = validateCustomerEdit(draft);
      if (!result.valid) throw new Error('Los datos del cliente no son válidos');
      // Only these four fields can change; never copy arbitrary properties from the draft.
      Object.assign(customer, result.data);
      return structuredClone(customer);
    },
    async addAddress(customerId, draft, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === customerId);
      if (!customer) throw new Error('Cliente de prueba no encontrado');
      const result = validateCustomerAddress(draft);
      if (!result.valid) throw new Error('La dirección no es válida');
      customer.addresses.push({ id: `demo-address-${crypto.randomUUID()}`, ...result.data });
      customer.addressCount = customer.addresses.length;
      return structuredClone(customer);
    },
    async updateAddress(customerId, addressId, draft, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === customerId);
      const address = customer?.addresses.find((item) => item.id === addressId);
      if (!customer || !address) throw new Error('Dirección de prueba no encontrada para este cliente');
      const result = validateCustomerAddress(draft);
      if (!result.valid) throw new Error('La dirección no es válida');
      Object.assign(address, result.data);
      return structuredClone(customer);
    },
    async deactivateCustomer(customerId, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === customerId);
      if (!customer) throw new Error('Cliente de prueba no encontrado');
      customer.enabled = false;
      return structuredClone(customer);
    },
    async deactivateAddress(customerId, addressId, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === customerId);
      if (!customer?.addresses.some((address) => address.id === addressId)) {
        throw new Error('Dirección de prueba no encontrada para este cliente');
      }
      customer.preview ??= { inactiveAddressIds: [] };
      if (!customer.preview.inactiveAddressIds.includes(addressId)) customer.preview.inactiveAddressIds.push(addressId);
      return structuredClone(customer);
    },
    async reactivateCustomer(customerId, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === customerId);
      if (!customer) throw new Error('Cliente de prueba no encontrado');
      customer.enabled = true;
      return structuredClone(customer);
    },
    async reactivateAddress(customerId, addressId, signal) {
      signal.throwIfAborted();
      const customer = records.find((item) => item.id === customerId);
      if (!customer?.addresses.some((address) => address.id === addressId)) {
        throw new Error('Dirección de prueba no encontrada para este cliente');
      }
      if (customer.preview) {
        customer.preview.inactiveAddressIds = customer.preview.inactiveAddressIds.filter((id) => id !== addressId);
      }
      return structuredClone(customer);
    },
  };
}

export const previewCustomersSource = createPreviewCustomersSource();
