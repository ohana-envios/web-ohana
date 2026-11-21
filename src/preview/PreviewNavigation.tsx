export function PreviewNavigation({ active }: { active: 'customers' | 'users' }) {
  return <nav className="preview-navigation" aria-label="Secciones de la vista previa">
    <a href="/customers-preview.html" aria-current={active === 'customers' ? 'page' : undefined}>Clientes</a>
    <a href="/users-preview.html" aria-current={active === 'users' ? 'page' : undefined}>Control · Usuarios</a>
  </nav>;
}
