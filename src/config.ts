export type AppConfig = {
  domain: string;
  clientId: string;
  audience: string;
  apiBaseUrl: string;
};

export function readConfig(env: ImportMetaEnv): AppConfig | null {
  const domain = env.VITE_AUTH0_DOMAIN?.trim();
  const clientId = env.VITE_AUTH0_CLIENT_ID?.trim();
  const audience = env.VITE_AUTH0_AUDIENCE?.trim();
  const apiBaseUrl = env.VITE_API_BASE_URL?.trim();
  if (!domain || !clientId || !audience || !apiBaseUrl) return null;
  try {
    const api = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(api.protocol)) return null;
    return { domain, clientId, audience, apiBaseUrl: api.toString().replace(/\/$/, '') };
  } catch {
    return null;
  }
}
