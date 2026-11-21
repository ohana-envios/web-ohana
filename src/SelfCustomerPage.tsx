import { useEffect, useState } from 'react';
import type { CustomersSource } from './customers/types';
import { CustomerDetail } from './customers/CustomerDetail';
import { ShipmentForm } from './shipments/ShipmentForm';
import { ShipmentList } from './shipments/ShipmentList';
export function SelfCustomerPage({ source, request, downloadReceipt, name, onExit }: { source: CustomersSource; request: <T>(path: string, init?: RequestInit) => Promise<T>; downloadReceipt: (id: string) => Promise<void>; name: string; onExit: () => void }) {
  const [open, setOpen] = useState(false); const [id, setId] = useState<string | null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  const [shipment, setShipment] = useState(false);
  const [listing, setListing] = useState(false);
  useEffect(() => { if (!open) return; const controller = new AbortController(); setError(false); setId(null);
    source.get('', controller.signal).then(customer => { if (!controller.signal.aborted) setId(customer.id); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [source, open, retry]);
  return <main className="content customer-portal"><header className="topbar"><div><span className="eyebrow">Ohana Envíos</span><h1>Hola, {name}</h1></div><button type="button" onClick={onExit}>Salir</button></header>
    {listing ? <><button type="button" onClick={() => setListing(false)}>Volver</button><ShipmentList request={request} downloadReceipt={downloadReceipt} own /></> : shipment ? <><button type="button" onClick={() => setShipment(false)}>Volver</button><ShipmentForm source={source} request={request} own /></> : open ? id ? <CustomerDetail id={id} source={source} preview={false} backLabel="← Volver a mi cuenta" onBack={() => setOpen(false)} onUpdated={() => {}} /> : <section className="panel customer-message"><p role={error ? 'alert' : 'status'}>{error ? 'No se pudo cargar tu ficha.' : 'Cargando tu ficha…'}</p>{error && <button className="customer-button" type="button" onClick={() => setRetry(n => n + 1)}>Reintentar</button>}<button className="customer-button" type="button" onClick={() => setOpen(false)}>Volver</button></section> : <section className="panel"><h2>Tu cuenta</h2>
      <div className="portal-actions">
        <button className="portal-primary" onClick={() => setShipment(true)}>Nuevo envío</button>
        <button onClick={() => setListing(true)}>Mis envíos</button>
        <button onClick={() => setOpen(true)}>Mis datos y direcciones</button>
      </div></section>}
  </main>;
}
