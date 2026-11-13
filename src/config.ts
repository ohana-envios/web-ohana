export type AppConfig = {
  issuerUrl: string;
  clientId: string;
  projectId: string;
  apiBaseUrl: string;
};

export function readConfig(env: ImportMetaEnv): AppConfig | null {
  const issuerUrl = env.VITE_ZITADEL_ISSUER_URL?.trim();
  const clientId = env.VITE_ZITADEL_CLIENT_ID?.trim();
  const projectId = env.VITE_ZITADEL_PROJECT_ID?.trim();
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();
  if (!issuerUrl || !clientId || !/^\d+$/.test(projectId ?? '') || !apiBaseUrl) return null;
  try {
    const api = new URL(apiBaseUrl);
    const issuer = new URL(issuerUrl);
    if (!['http:', 'https:'].includes(api.protocol)) return null;
    if (issuer.protocol !== 'https:' || issuer.pathname !== '/' || issuer.search || issuer.hash) return null;
    return { issuerUrl: issuer.origin, clientId, projectId: projectId!, apiBaseUrl: api.toString().replace(/\/$/, '') };
  } catch {
    return null;
  }
}
