import { useState } from 'react';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
export function ShipmentDelivery({ id, request, onComplete }: { id: string; request: Request; onComplete: () => void }) {
  const [receiver, setReceiver] = useState(''); const [relationship, setRelationship] = useState(''); const [observation, setObservation] = useState(''); const [evidence, setEvidence] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function confirm() {
    if (!receiver.trim() || !window.confirm('¿Confirmás que entregaste físicamente este envío?')) return;
    setBusy(true); setError('');
    try { const body = new FormData(); body.append('payload', JSON.stringify({ receiver, relationship, observation })); if (evidence) body.append('evidence', evidence); await request(`/api/shipments/${encodeURIComponent(id)}/delivery`, { method: 'POST', body }); onComplete(); }
    catch { setError('No se pudo confirmar la entrega. Recargá el envío y verificá su estado y custodia.'); } finally { setBusy(false); }
  }
  return <section><h3>Confirmar entrega</h3><label>Nombre de quien recibió<input maxLength={120} value={receiver} onChange={(event) => setReceiver(event.target.value)} /></label><label>Relación con el destinatario (opcional)<input maxLength={120} value={relationship} onChange={(event) => setRelationship(event.target.value)} /></label><label>Observación opcional<textarea maxLength={1000} value={observation} onChange={(event) => setObservation(event.target.value)} /></label><label>Evidencia opcional (PDF, PNG o JPG, hasta 5 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))) { setEvidence(null); event.target.value = ''; setError('Elegí un PDF, PNG o JPG de hasta 5 MB.'); } else { setEvidence(file); setError(''); } }} /></label><button type="button" disabled={busy || !receiver.trim()} onClick={() => void confirm()}>{busy ? 'Registrando…' : 'Confirmar entrega'}</button>{error && <p role="alert">{error}</p>}</section>;
}
