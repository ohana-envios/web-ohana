export function createApiClient(baseUrl: string, getToken: () => Promise<string>) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) {
      let code: string | undefined;
      try { const body: unknown = await response.json(); if (body && typeof body === 'object' && 'code' in body && body.code === 'CUSTOMER_EMAIL_DUPLICATE') code = body.code; } catch { /* Keep the generic error when no structured body is available. */ }
      throw Object.assign(new Error(`La API respondió ${response.status}`), { status: response.status, ...(code ? { code } : {}) });
    }
    return response.json() as Promise<T>;
  };
}
