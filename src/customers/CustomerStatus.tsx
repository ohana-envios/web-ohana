export function CustomerStatus({ enabled }: { enabled: boolean }) {
  return <span className={`customer-status ${enabled ? 'is-enabled' : 'is-disabled'}`}>
    <span aria-hidden="true">{enabled ? '●' : '○'}</span>
    {enabled ? 'Habilitado' : 'Deshabilitado'}
  </span>;
}
