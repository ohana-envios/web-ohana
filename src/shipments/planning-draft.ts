export type PlanningRow = { id: string; code: string; recipientName: string; assignedCourierId: string | null; plannedFor: string | null };
export type PlanningCourier = { id: string; displayName: string };
export type DraftEntry = { id: string; code: string; recipientName: string; courierId: string; courierName: string; expectedCourierId: string | null; expectedPlannedFor: string | null };
export type PlanningDraft = Record<string, DraftEntry>;
export function selectAssignment(draft: PlanningDraft, row: PlanningRow, courier: PlanningCourier | null): PlanningDraft {
  const next = { ...draft };
  if (!courier) { delete next[row.id]; return next; }
  if (!draft[row.id] && Object.keys(draft).length >= 50) throw new Error('Podés confirmar hasta 50 envíos a la vez.');
  next[row.id] = { id: row.id, code: row.code, recipientName: row.recipientName, courierId: courier.id, courierName: courier.displayName, expectedCourierId: draft[row.id] ? draft[row.id].expectedCourierId : row.assignedCourierId, expectedPlannedFor: draft[row.id] ? draft[row.id].expectedPlannedFor : row.plannedFor?.slice(0, 10) ?? null };
  return next;
}
export function planningPayload(draft: PlanningDraft) {
  return Object.values(draft).map(({ id, courierId, expectedCourierId, expectedPlannedFor }) => ({ id, courierId, expectedCourierId, expectedPlannedFor }));
}
