export function createApiClient(baseUrl: string, getToken: () => Promise<string>) {
  return async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken();
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
    if (!response.ok) throw new Error(`La API respondió ${response.status}`);
    return response.json() as Promise<T>;
  };
}
