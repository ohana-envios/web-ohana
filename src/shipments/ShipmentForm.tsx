import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { CustomerDetail, CustomersSource, CustomerSummary } from '../customers/types';
import { AdminCustomerRegistration } from '../AdminCustomerRegistration';
import type { RegistrationsSource } from '../registrations';

type Request = <T>(path: string, init?: RequestInit) => Promise<T>;
type Address = { label: string; street: string; number: string; locality: string; department: string; reference: string; notes: string };
const emptyAddress = (): Address => ({ label: '', street: '', number: '', locality: '', department: '', reference: '', notes: '' });

export function ShipmentForm({ source, request, own = false, onCreated, registrations }: { source: CustomersSource; request: Request; own?: boolean; onCreated?: () => void; registrations?: RegistrationsSource }) {
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]); const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [pickupId, setPickupId] = useState('new'); const [pickup, setPickup] = useState(emptyAddress); const [delivery, setDelivery] = useState(emptyAddress);
  const [saveAddress, setSaveAddress] = useState(false); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [packageDescription, setPackageDescription] = useState(''); const [when, setWhen] = useState(''); const [notes, setNotes] = useState('');
  const [deliveryWhen, setDeliveryWhen] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [registerCustomer, setRegisterCustomer] = useState(false);
  const attempt = useRef<{ key: string; payload: string; receipt: File | null } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const [uncertain, setUncertain] = useState(false);
  const [review, setReview] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [code, setCode] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    if (own) source.get('', controller.signal).then(setCustomer).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar tu ficha de cliente.'); });
    else source.list({ search, status: 'enabled', page, pageSize: 20 }, controller.signal).then((value) => { setCustomers(value.items); setPages(value.totalPages); }).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar la lista de clientes.'); });
    return () => controller.abort();
  }, [source, own, search, page]);
  async function choose(id: string, justCreated = false) {
    setCustomer(null); setPickupId('new'); setError('');
    try { setCustomer(await source.get(id, new AbortController().signal)); } catch { setError(justCreated ? 'El cliente fue creado, pero no se pudo cargar su ficha. Buscalo y seleccionalo para continuar.' : 'No se pudo cargar la ficha del cliente.'); }
  }
  async function submit() {
    if (!customer || busy) return;
    if (!attempt.current && (!form.current?.reportValidity() || !/^[+\d() .-]+$/.test(phone) || !/\d/.test(phone) || (when && deliveryWhen && new Date(deliveryWhen) < new Date(when)))) { setReview(false); setError('Revisá los datos y las fechas antes de confirmar.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { customerId: customer.id, recipientName: name, recipientPhone: phone, pickup: pickupId === 'new' ? { kind: 'new', address: pickup, save: saveAddress } : { kind: 'saved', id: pickupId }, delivery, packageDescription, requestedPickupAt: when ? new Date(when).toISOString() : '', requestedDeliveryAt: deliveryWhen ? new Date(deliveryWhen).toISOString() : '', notes };
      const current = attempt.current ?? { key: crypto.randomUUID(), payload: JSON.stringify(payload), receipt };
      attempt.current = current;
      const multipart = new FormData(); if (current.receipt) { multipart.append('payload', current.payload); multipart.append('receipt', current.receipt); }
      const headers: Record<string, string> = { 'Idempotency-Key': current.key }; if (!current.receipt) headers['Content-Type'] = 'application/json';
      const result = await request<{ code: string }>('/api/shipments', { method: 'POST', headers, body: current.receipt ? multipart : current.payload });
      attempt.current = null; setUncertain(false); setCode(result.code); setReview(false); onCreated?.();
    } catch (reason) { const status = (reason as { status?: number })?.status; if (!uncertain && status && status >= 400 && status < 500 && status !== 408 && status !== 429) { attempt.current = null; setUncertain(false); setReview(false); setError(reason instanceof Error ? reason.message : 'Revisá los datos del envío.'); } else { setUncertain(true); setError('No pudimos confirmar si se registró el envío. Reintentá para comprobarlo sin crear otro.'); } }
    finally { setBusy(false); }
  }
  const addressFields = (label: string, value: Address, update: (next: Address) => void) => <fieldset><legend>{label}</legend>{([['street', 'Calle', 160], ['number', 'Número', 30], ['locality', 'Localidad', 80], ['department', 'Departamento', 80], ['reference', 'Referencia', 240]] as const).map(([key, title, max]) => <label key={key}>{title}<input required={key !== 'reference'} maxLength={max} value={value[key]} onChange={(event) => update({ ...value, [key]: event.target.value })} /></label>)}</fieldset>;
  if (uncertain && attempt.current) return <section className="panel"><h2>Registro sin confirmar</h2><p role="alert">{error}</p><p>Código para consultar: <strong>OH-{attempt.current.key.toUpperCase()}</strong>. Anotalo antes de salir de esta pantalla.</p><button type="button" disabled={busy} onClick={() => void submit()}>{busy ? 'Comprobando…' : 'Reintentar y comprobar'}</button></section>;
  if (code) return <section className="panel"><h2>Envío registrado</h2><p>El código del envío es <strong>{code}</strong>.</p><button type="button" onClick={() => { setCode(''); setName(''); setPhone(''); setPackageDescription(''); setWhen(''); setDeliveryWhen(''); setReceipt(null); setNotes(''); setPickup(emptyAddress()); setDelivery(emptyAddress()); setPickupId('new'); setSaveAddress(false); }}>Registrar otro envío</button></section>;
  return <section className="panel"><h2>Nuevo envío</h2>{error && <p role="alert">{error}</p>}
    {!own && <div><label>Buscar cliente<input value={search} maxLength={120} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></label><ul>{customers.map((item) => <li key={item.id}>{item.displayName} <button type="button" onClick={() => void choose(item.id)}>Seleccionar</button></li>)}</ul><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button> Página {page} de {Math.max(pages, 1)} <button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button>{registrations && <><button type="button" onClick={() => setRegisterCustomer(!registerCustomer)}>{registerCustomer ? 'Cerrar alta de cliente' : 'Registrar nuevo cliente'}</button>{registerCustomer && <AdminCustomerRegistration source={registrations} onCreated={(id) => { setRegisterCustomer(false); setSearch(''); setPage(1); void choose(id, true); }} />}</>}</div>}
    {customer && <form ref={form} onSubmit={(event: FormEvent) => { event.preventDefault(); if (!/^[+\d() .-]+$/.test(phone) || !/\d/.test(phone)) { setError('Revisá el teléfono del destinatario.'); return; } if (when && deliveryWhen && new Date(deliveryWhen) < new Date(when)) { setError('La entrega no puede ser anterior al retiro.'); return; } setError(''); setReview(true); }}><p>Cliente: <strong>{customer.displayName}</strong></p>
      <label>Dirección de retiro<select value={pickupId} onChange={(event) => setPickupId(event.target.value)}><option value="new">Ingresar una dirección nueva</option>{customer.addresses.filter((address) => address.active !== false).map((address) => <option key={address.id} value={address.id}>{address.street} {address.number}, {address.locality}</option>)}</select></label>
      {pickupId === 'new' && <>{addressFields('Retiro', pickup, setPickup)}<label><input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} /> Guardar como dirección habitual</label></>}
      {addressFields('Entrega', delivery, setDelivery)}
      <label>Destinatario<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Teléfono del destinatario<input required type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label>Descripción del paquete<input required maxLength={500} value={packageDescription} onChange={(event) => setPackageDescription(event.target.value)} /></label>
      <label>Fecha y hora de retiro (opcional)<input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} /></label>
      <label>Fecha y hora de entrega solicitada (opcional)<input type="datetime-local" value={deliveryWhen} onChange={(event) => setDeliveryWhen(event.target.value)} /></label>
      <label>Comprobante de pago opcional (PDF, PNG o JPG, hasta 5 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0] ?? null; if (file && (file.size > 5 * 1024 * 1024 || !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))) { event.target.value = ''; setReceipt(null); setError('Elegí un PDF, PNG o JPG de hasta 5 MB.'); } else { setReceipt(file); setError(''); } }} /></label><p>Adjuntar un comprobante no confirma el pago.</p>
      <label>Observaciones<textarea maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {!review ? <button type="submit">Revisar envío</button> : <div><h3>Revisá antes de confirmar</h3><p>Cliente: {customer.displayName}. Destinatario: {name}, teléfono {phone}.</p><p>Retiro: {pickupId === 'new' ? `${pickup.street} ${pickup.number}, ${pickup.locality}, ${pickup.department}` : customer.addresses.filter((address) => address.id === pickupId).map((address) => `${address.street} ${address.number}, ${address.locality}, ${address.department}`).join('')}. Entrega: {delivery.street} {delivery.number}, {delivery.locality}, {delivery.department}.</p><p>Paquete: {packageDescription}. Retiro solicitado: {when || 'sin indicar'}. Entrega solicitada: {deliveryWhen || 'sin indicar'}. Observaciones: {notes || 'ninguna'}.</p><button type="button" disabled={busy} onClick={() => void submit()}>{busy ? 'Registrando…' : 'Confirmar envío'}</button> <button type="button" onClick={() => setReview(false)}>Seguir editando</button></div>}
    </form>}
  </section>;
}
