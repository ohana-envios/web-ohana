import { useState } from 'react';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
export function ShipmentPickup({ id, request, onComplete }: { id: string; request: Request; onComplete: () => void }) {
  const [observation, setObservation] = useState(''); const [evidence, setEvidence] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function confirm() {
    if (!window.confirm('¿Confirmás que retiraste físicamente los paquetes de este envío?')) return;
    const body = new FormData(); body.append('payload', JSON.stringify({ observation })); if (evidence) body.append('evidence', evidence);
    setBusy(true); setError('');
    try { await request(`/api/shipments/${encodeURIComponent(id)}/pickup`, { method: 'POST', body }); onComplete(); }
    catch { setError('No se pudo confirmar el retiro. Recargá el envío y verificá la asignación.'); } finally { setBusy(false); }
  }
  return <section><h3>Confirmar retiro</h3><p>Comprobá los paquetes antes de confirmar que los recibiste.</p><label>Observación opcional<textarea maxLength={1000} value={observation} onChange={(e) => setObservation(e.target.value)} /></label><label>Evidencia opcional (PDF, PNG o JPG, hasta 5 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => { const file = e.target.files?.[0] ?? null; if (file && (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))) { setEvidence(null); e.target.value = ''; setError('Elegí un PDF, PNG o JPG de hasta 5 MB.'); } else { setEvidence(file); setError(''); } }} /></label><button type="button" disabled={busy} onClick={() => void confirm()}>{busy ? 'Registrando…' : 'Confirmar retiro'}</button>{error && <p role="alert">{error}</p>}</section>;
}
