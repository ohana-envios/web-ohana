export function directShipmentCode(filters: { code: string; customer: string; recipient: string; responsible: string; status: string; priority: string; from: string; to: string }): string | null {
  const code = filters.code.trim();
  if (!/^OH-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)) return null;
  return [filters.customer, filters.recipient, filters.responsible, filters.status, filters.priority, filters.from, filters.to].some((value) => value.trim()) ? null : code;
}
