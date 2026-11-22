import { useState } from 'react';
import { labelHtml, type LabelData } from './label';
type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
export function ShipmentLabel({ id, request }: { id: string; request: Request }) {
  const [data, setData] = useState<LabelData | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function preview() { setBusy(true); setError(''); try { const result = await request<LabelData>(`/api/shipments/${encodeURIComponent(id)}/label`); labelHtml(result); setData(result); } catch { setData(null); setError('No se pudo obtener la etiqueta. Intentá de nuevo.'); } finally { setBusy(false); } }
  function download() { if (!data) return; const url = URL.createObjectURL(new Blob([labelHtml(data)], { type: 'text/html;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = 'etiqueta-ohana.html'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  return <section><button type="button" disabled={busy} onClick={() => void preview()}>{busy ? 'Cargando…' : data ? 'Actualizar etiqueta' : 'Ver etiqueta'}</button>{error && <p role="alert">{error}</p>}{data && <div><h3>Vista previa de etiqueta</h3><p><strong>{data.code}</strong> · {data.packageCount} {data.packageCount === 1 ? 'bulto' : 'bultos'}</p><p>Destinatario: {data.recipientName}</p><p>Entrega: {data.street} {data.number}, {data.locality}, {data.department}</p><p>Se generará una etiqueta por bulto con el mismo código.</p><button type="button" onClick={download}>Descargar etiquetas para imprimir</button></div>}</section>;
}
