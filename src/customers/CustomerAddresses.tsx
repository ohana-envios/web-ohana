import type { CustomerAddress, CustomerDetail } from './types';
import { isAddressActive } from './customer-address';

export function CustomerAddresses({ customer, preview, onAdd, onEdit, onDeactivate, onReactivate }: {
  customer: CustomerDetail;
  preview: boolean;
  onAdd?: () => void;
  onEdit?: (address: CustomerAddress) => void;
  onDeactivate?: (address: CustomerAddress) => void;
  onReactivate?: (address: CustomerAddress) => void;
}) {
  const inactiveIds = customer.preview?.inactiveAddressIds ?? [];
  const inactiveCount = customer.addresses.filter((address) => !isAddressActive(address, inactiveIds)).length;
  const activeCount = customer.addresses.length - inactiveCount;
  return <div className="panel customer-addresses">
    <span className="eyebrow">RETIROS</span>
    <h3>Direcciones habituales <span className="customer-count">{customer.addresses.length}</span></h3>
    {onDeactivate && activeCount <= 1 && <p className="customer-muted" id="last-active-address">{activeCount === 0 ? 'Este cliente no tiene direcciones activas. Agregá o reactivá una.' : 'Debe quedar al menos una dirección activa. Para desactivar la última, agregá o reactivá otra primero.'}</p>}
    {inactiveCount > 0 && <p className="customer-muted">{customer.addresses.length - inactiveCount} activas · {inactiveCount} desactivadas. Se conservan todas para consulta.</p>}
    {customer.addresses.length === 0 ? <p>No hay direcciones habituales registradas.</p> :
      <ul className="customer-address-list">{customer.addresses.map((address, index) => {
        const inactive = !isAddressActive(address, inactiveIds);
        return <li key={address.id} className={inactive ? 'customer-address-inactive' : undefined}>
          <span className="customer-address-number" aria-hidden="true">{index + 1}</span>
          <div><h4>{address.label ?? `Dirección ${index + 1}`}</h4>
            {(preview || typeof address.active === 'boolean') && <span className={`customer-status ${inactive ? 'is-disabled' : 'is-enabled'}`}>{inactive ? 'Desactivada' : 'Activa'}</span>}
            <p>{address.street} {address.number}</p><p className="customer-muted">{address.locality}, {address.department}</p>
            {address.reference && <p><strong>Referencia:</strong> {address.reference}</p>}
            {address.notes && <p><strong>Observaciones:</strong> {address.notes}</p>}
            <div className="customer-address-actions">
              {onEdit && <button type="button" className="customer-button" aria-label={`Editar dirección ${address.label ?? index + 1}`} onClick={() => onEdit(address)}>Editar dirección</button>}
              {onDeactivate && !inactive && <button type="button" className="customer-button customer-button-danger" disabled={activeCount <= 1} aria-describedby={activeCount === 1 ? 'last-active-address' : undefined} aria-label={`Desactivar dirección ${address.label ?? index + 1}`} onClick={() => onDeactivate(address)}>Desactivar dirección</button>}
              {onReactivate && inactive && <button type="button" className="customer-button customer-button-primary" aria-label={`Reactivar dirección ${address.label ?? index + 1}`} onClick={() => onReactivate(address)}>Reactivar dirección</button>}
            </div>
          </div>
        </li>;
      })}</ul>}
    {onAdd && <div className="customer-edit-actions"><button type="button" className="customer-button" onClick={onAdd}>Agregar dirección</button></div>}
  </div>;
}
