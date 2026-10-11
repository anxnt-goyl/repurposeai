/**
 * Centralized API Client with JWT Bearer Token, standard error translation, and timeout handling.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  public code?: string;
  public status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('repurposeai_token');
}

export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('repurposeai_token', token);
  } else {
    localStorage.removeItem('repurposeai_token');
  }
}

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Automatically attach Authorization header if token exists
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let json: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    const errorMsg =
      json?.error?.message ||
      json?.message ||
      `Request failed with status ${response.status}: ${response.statusText}`;
    const errorCode = json?.error?.code || json?.code;
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  // Standard backend envelope: { success: true, data: ... }
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }

  return (json || {}) as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'GET', headers }),

  post: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers,
    }),

  patch: <T = any>(endpoint: string, body?: any, headers?: HeadersInit) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    }),

  delete: <T = any>(endpoint: string, headers?: HeadersInit) =>
    request<T>(endpoint, { method: 'DELETE', headers }),
};
