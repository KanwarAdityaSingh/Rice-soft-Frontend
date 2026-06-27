import { apiService } from './api';
import { getAccessToken } from './authStorage';

const AUTH_SKIP_REFRESH_SUFFIXES = [
  '/auth/loginUser',
  '/auth/requestOtp',
  '/auth/verifyOtp',
  '/auth/refreshToken',
];

function shouldSkipTokenRefresh(url: string): boolean {
  return AUTH_SKIP_REFRESH_SUFFIXES.some((suffix) => url.includes(suffix));
}

/** Fetch with httpOnly refresh cookie + Bearer access token; retries once after refresh on 401. */
export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
  isRetry = false
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && !isRetry && !shouldSkipTokenRefresh(url)) {
    const newToken = await apiService.tryRefreshAccessToken();
    if (newToken) {
      return authenticatedFetch(url, init, true);
    }
  }

  return response;
}

export async function authenticatedFetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await authenticatedFetch(url, init);
  const data = await response.json();
  apiService.inspectSessionFromResponse(data);

  if (!response.ok) {
    const message =
      (data as { message?: string; error?: string })?.message ||
      (data as { message?: string; error?: string })?.error ||
      'Request failed';
    throw new Error(message);
  }

  return data as T;
}

/** Parse envelope `{ success, data }` from authenticated multipart/json responses. */
export async function authenticatedFetchEnvelopeData<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const body = await authenticatedFetchJson<{
    success?: boolean;
    data?: T;
    message?: string;
  }>(url, init);

  if (body && typeof body === 'object') {
    if (body.success === false) {
      throw new Error(body.message || 'Request failed');
    }
    if ('data' in body) {
      return body.data as T;
    }
  }

  return body as T;
}
