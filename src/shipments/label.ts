export type LabelData = { code: string; recipientName: string; street: string; number: string; locality: string; department: string; packageCount: number };
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function labelHtml(data: LabelData): string {
  if (!Number.isSafeInteger(data.packageCount) || data.packageCount < 1 || data.packageCount > 100) throw new Error('Cantidad de bultos inválida');
  const labels = Array.from({ length: data.packageCount }, (_, index) => `<article><h1>Ohana Envíos</h1><h2>${escape(data.code)}</h2><p>Bulto ${index + 1} de ${data.packageCount}</p><p><strong>Destinatario:</strong> ${escape(data.recipientName)}</p><p><strong>Entrega:</strong> ${escape(data.street)} ${escape(data.number)}, ${escape(data.locality)}, ${escape(data.department)}</p></article>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Etiqueta Ohana</title><style>body{font:16px sans-serif}article{border:2px solid #111;padding:18px;margin:12px;break-after:page}h2{overflow-wrap:anywhere}@media print{article{margin:0;border:1px solid #111}}</style></head><body>${labels}</body></html>`;
}
