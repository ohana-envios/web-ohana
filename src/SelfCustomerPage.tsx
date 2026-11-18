import { useEffect, useState } from 'react';
import type { CustomersSource } from './customers/types';
import { CustomerDetail } from './customers/CustomerDetail';
export function SelfCustomerPage({ source, name, onExit }: { source: CustomersSource; name: string; onExit: () => void }) {
  const [open, setOpen] = useState(false); const [id, setId] = useState<string | null>(null); const [error, setError] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => { if (!open) return; const controller = new AbortController(); setError(false); setId(null);
    source.get('', controller.signal).then(customer => { if (!controller.signal.aborted) setId(customer.id); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [source, open, retry]);
  return <main className="content"><header className="topbar"><h1>Hola, {name}</h1><button type="button" onClick={onExit}>Salir</button></header>
    {open ? id ? <CustomerDetail id={id} source={source} preview={false} backLabel="← Volver a mi cuenta" onBack={() => setOpen(false)} onUpdated={() => {}} /> : <section className="panel customer-message"><p role={error ? 'alert' : 'status'}>{error ? 'No se pudo cargar tu ficha.' : 'Cargando tu ficha…'}</p>{error && <button className="customer-button" type="button" onClick={() => setRetry(n => n + 1)}>Reintentar</button>}<button className="customer-button" type="button" onClick={() => setOpen(false)}>Volver</button></section> : <section className="panel"><h2>Tu cuenta</h2><p>Podés revisar y actualizar tus datos y direcciones habituales.</p><button className="customer-button" type="button" onClick={() => setOpen(true)}>Mis datos y direcciones</button><p>Las funciones de envíos todavía no están disponibles.</p></section>}
  </main>;
}
