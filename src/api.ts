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
      let message = `La API respondió ${response.status}`;
      try {
        const body: unknown = await response.json();
        if (body && typeof body === 'object') {
          if ('code' in body && body.code === 'CUSTOMER_EMAIL_DUPLICATE') code = body.code;
          if ('message' in body && Array.isArray(body.message)) message = body.message.join('. ');
          else if ('message' in body && typeof body.message === 'string') message = body.message;
        }
      } catch { /* Keep the status message when the API has no JSON body. */ }
      throw Object.assign(new Error(message), { status: response.status, ...(code ? { code } : {}) });
    }
    return response.json() as Promise<T>;
  };
}
