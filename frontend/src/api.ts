/**
 * Centralized Frontend API Client
 *
 * Uses HttpOnly server-side session cookies (`foner_session`) with CSRF protection (`foner_csrf`)
 * and in-memory session state. Never stores authentication tokens or elevated roles in localStorage.
 */

import { AnalyticsRange, RevenueAnalyticsResponse, StoreStatistics, User } from './types';

let inMemoryCustomerToken: string | null = null;
let inMemoryAdminToken: string | null = null;
let inMemoryCustomerUser: User | null = null;
let inMemoryCsrfToken: string | null = null;

// Immediately purge any legacy session tokens or user objects from browser localStorage
try {
  localStorage.removeItem('foner_current_user');
  localStorage.removeItem('foner_customer_token');
  localStorage.removeItem('foner_customer_user');
  localStorage.removeItem('foner_admin_token');
} catch {
  // ignore storage errors
}

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return inMemoryCsrfToken;
  try {
    const match = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('foner_csrf='));
    if (match) {
      return decodeURIComponent(match.slice('foner_csrf='.length));
    }
  } catch {
    // ignore cookie read errors
  }
  return inMemoryCsrfToken;
}

export function getCustomerToken(): string | null {
  return inMemoryCustomerToken;
}

export function setCustomerToken(token: string | null): void {
  inMemoryCustomerToken = token ? token.trim() : null;
  if (!token) {
    inMemoryCustomerUser = null;
  }
}

export function getStoredCustomerUser(): User | null {
  return inMemoryCustomerUser;
}

export function setStoredCustomerUser(user: User | null): void {
  if (user) {
    inMemoryCustomerUser = { ...user, status: user.status || 'active' };
  } else {
    inMemoryCustomerUser = null;
  }
}

export function getAdminToken(): string | null {
  return inMemoryAdminToken;
}

export function setAdminToken(token: string | null): void {
  inMemoryAdminToken = token ? token.trim() : null;
}

function isAdminRequest(url: string, method: string): boolean {
  const m = method.toUpperCase();
  if (
    url.startsWith('/api/admin') ||
    url.startsWith('/api/users') ||
    url.startsWith('/api/audit-logs') ||
    url.startsWith('/api/database')
  ) {
    return true;
  }
  if (
    url.startsWith('/api/orders/') &&
    !url.startsWith('/api/orders/track/') &&
    !url.endsWith('/reorder') &&
    !url.endsWith('/cancel')
  ) {
    // e.g. PATCH /api/orders/:id/status
    return true;
  }
  if (url.startsWith('/api/restock-notifications')) {
    // Customer only calls POST /api/restock-notifications to subscribe;
    // GET, DELETE, and POST .../notify are admin operations
    if (m !== 'POST' || url.includes('/notify')) {
      return true;
    }
  }
  if (
    (url.startsWith('/api/products') ||
      url.startsWith('/api/categories') ||
      url.startsWith('/api/subcategories') ||
      url.startsWith('/api/banners') ||
      url.startsWith('/api/coupons') ||
      url.startsWith('/api/settings') ||
      url.startsWith('/api/store_settings') ||
      url.startsWith('/api/faqs') ||
      url.startsWith('/api/pages') ||
      url.startsWith('/api/upload')) &&
    m !== 'GET' &&
    !url.startsWith('/api/coupons/validate')
  ) {
    return true;
  }
  return false;
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024; // 12 MB raw input limit
const MAX_IMAGE_DIMENSION = 1600;

async function compressImageIfNeeded(file: File): Promise<string> {
  const mime = (file.type || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mime)) {
    throw new Error(
      'Unsupported image format. Please upload a JPG, PNG, WebP, AVIF, or GIF image.'
    );
  }
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error('Image file is too large (maximum 12 MB). Please choose a smaller image.');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected image file.'));
    reader.readAsDataURL(file);
  });

  // Skip canvas re-encoding for GIFs or small images under 500 KB unless dimensions are huge
  if (mime === 'image/gif' || typeof document === 'undefined') {
    return rawDataUrl;
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Invalid or corrupted image file.'));
      image.src = rawDataUrl;
    });

    const needsResize =
      img.naturalWidth > MAX_IMAGE_DIMENSION || img.naturalHeight > MAX_IMAGE_DIMENSION;
    const needsCompression = file.size > 600 * 1024;

    if (!needsResize && !needsCompression) {
      return rawDataUrl;
    }

    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(img.naturalWidth || 1, img.naturalHeight || 1)
    );
    const targetWidth = Math.max(1, Math.round(img.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return rawDataUrl;

    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    const outputMime = mime === 'image/png' ? 'image/webp' : 'image/jpeg';
    const compressed = canvas.toDataURL(outputMime, 0.85);
    return compressed && compressed.length < rawDataUrl.length ? compressed : rawDataUrl;
  } catch {
    return rawDataUrl;
  }
}

export async function uploadImageFromComputer(file: File): Promise<string> {
  const dataUrl = await compressImageIfNeeded(file);

  const res = await apiFetch('/api/admin/upload', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      data_url: dataUrl,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload image to server.');
  }
  return String(data.url);
}

const API_BASE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '')
    : ''
).replace(/\/+$/, '');

export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const cleanInput = input.startsWith('/') ? input : `/${input}`;
  let base = API_BASE_URL;
  // Normalize: if base ends with /api and input starts with /api/, strip /api from base
  // to avoid double /api paths (e.g., .../api/api/auth/login).
  if (base.endsWith('/api') && cleanInput.startsWith('/api/')) {
    base = base.slice(0, -4);
  }
  const url =
    cleanInput.startsWith('http://') || cleanInput.startsWith('https://')
      ? cleanInput
      : `${base}${cleanInput}`;
  const method = (init?.method || 'GET').toUpperCase();
  const headers = new Headers(init?.headers || {});

  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const csrfToken = readCsrfCookie();
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  const customerToken = getCustomerToken();
  const adminToken = getAdminToken();
  const activeToken = isAdminRequest(url, method)
    ? adminToken || customerToken
    : customerToken || adminToken;

  if (activeToken) {
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${activeToken}`);
    }
    if (!headers.has('X-Customer-Token')) {
      headers.set('X-Customer-Token', activeToken);
    }
    if (!headers.has('X-Admin-Token')) {
      headers.set('X-Admin-Token', activeToken);
    }
  }

  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });

  const respCsrf = response.headers.get('X-CSRF-Token');
  if (respCsrf) {
    inMemoryCsrfToken = respCsrf;
  }

  return response;
}

/**
 * Reads response body once and safely parses JSON only when appropriate.
 * Handles empty bodies, non-JSON errors, and network-level empty responses.
 */
export async function parseResponseJson(res: Response): Promise<any> {
  // Read body once; do not call res.json() separately.
  let text = '';
  try {
    text = await res.text();
  } catch {
    return { _parseError: 'Failed to read response body' };
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return {};
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return { _raw: trimmed, _parseError: 'Invalid JSON in response body' };
  }
}

export interface BackendDiagnosticResult {
  connected: boolean;
  statusText: string;
  latencyMs: number;
  checkedAt: string;
  error?: string;
}

export interface DatabaseDiagnosticResult {
  connected: boolean;
  statusText: string;
  databaseName?: string;
  latencyMs: number;
  checkedAt: string;
  error?: string;
}

/**
 * Performs a real HTTP request from the frontend to the backend health endpoint (GET /api/health).
 * Only returns connected: true if the backend actually responds with HTTP 200/OK.
 * Never returns mock or fake success.
 */
export async function testBackendConnection(): Promise<BackendDiagnosticResult> {
  const start = performance.now();
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  try {
    const res = await apiFetch('/api/health', { method: 'GET' });
    const latency = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        connected: false,
        statusText: 'Not Connected',
        latencyMs: latency,
        checkedAt: timestamp,
        error: `HTTP ${res.status}: Backend responded with error status.`,
      };
    }

    const data = await res.json().catch(() => ({}));
    if (data && (data.status === 'ok' || data.backend === 'connected')) {
      return {
        connected: true,
        statusText: 'Connected',
        latencyMs: latency,
        checkedAt: timestamp,
      };
    }

    return {
      connected: false,
      statusText: 'Not Connected',
      latencyMs: latency,
      checkedAt: timestamp,
      error: 'Backend health check returned invalid status payload.',
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return {
      connected: false,
      statusText: 'Not Connected',
      latencyMs: latency,
      checkedAt: timestamp,
      error: err?.message || 'Network error: Failed to reach backend server.',
    };
  }
}

/**
 * Performs a real query through the backend to PostgreSQL (GET /api/admin/diagnostics/database).
 * The backend performs `SELECT 1` against PostgreSQL and returns verified status.
 * Frontend NEVER directly touches PostgreSQL.
 * Never exposes credentials, passwords, or connection strings.
 */
export async function testDatabaseConnection(): Promise<DatabaseDiagnosticResult> {
  const start = performance.now();
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
  try {
    const res = await apiFetch('/api/admin/diagnostics/database', { method: 'GET' });
    const latency = Math.round(performance.now() - start);
    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.connected) {
      return {
        connected: false,
        statusText: 'Not Connected',
        latencyMs: latency,
        checkedAt: timestamp,
        error: data?.error || `HTTP ${res.status}: Failed to reach PostgreSQL database.`,
      };
    }

    return {
      connected: true,
      statusText: 'Connected',
      databaseName: data.database || 'f',
      latencyMs: typeof data.latency_ms === 'number' ? data.latency_ms : latency,
      checkedAt: timestamp,
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return {
      connected: false,
      statusText: 'Not Connected',
      latencyMs: latency,
      checkedAt: timestamp,
      error: err?.message || 'Network error: Unable to contact backend diagnostic route.',
    };
  }
}

/**
 * Fetches consolidated store statistics directly from the PostgreSQL backend:
 * - Total Revenue (excluding cancelled orders), Completed/Delivered Revenue, Pending/Confirmed Revenue
 * - Order counts by status (Pending, Confirmed, Processing, Shipped, Delivered, Cancelled)
 * - Low Stock & Out-of-Stock product counts and items
 */
export async function fetchStoreStatistics(
  lowStockThreshold = 3
): Promise<StoreStatistics> {
  const res = await apiFetch(
    `/api/admin/stats?threshold=${encodeURIComponent(String(lowStockThreshold))}`
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch consolidated store statistics from database.');
  }
  return (await res.json()) as StoreStatistics;
}

export const fetchConsolidatedStoreStats = fetchStoreStatistics;
export const getStoreStats = fetchStoreStatistics;
export const fetchAdminStats = fetchStoreStatistics;

export async function sendRegistrationOtp(email: string, name?: string): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await apiFetch('/api/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), name: (name || '').trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send verification OTP email.');
  }
  return data;
}

export async function verifyRegistrationOtp(email: string, otp: string): Promise<{
  verified: boolean;
  message: string;
}> {
  const res = await apiFetch('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Invalid or expired OTP code.');
  }
  return data;
}

export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Unable to process password reset request.');
  }
  return data;
}

export async function confirmPasswordReset(
  email: string,
  otp: string,
  newPassword: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      otp: otp.trim(),
      newPassword,
      new_password: newPassword,
      password: newPassword,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Invalid or expired password reset code.');
  }
  return data;
}

export async function changeAdminCredentials(payload: {
  currentPassword: string;
  newEmail?: string;
  newPassword?: string;
}): Promise<{
  success: boolean;
  message: string;
  user: User;
}> {
  const res = await apiFetch('/api/admin/credentials', {
    method: 'PUT',
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      current_password: payload.currentPassword,
      newEmail: payload.newEmail,
      new_email: payload.newEmail,
      newPassword: payload.newPassword,
      new_password: payload.newPassword,
      password: payload.newPassword,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update admin credentials.');
  }
  return data;
}

/**
 * Fetches time-series revenue and order analytics (7d, 30d, 3m, 6m, 1y) directly from PostgreSQL,
 * explicitly filtering out cancelled orders.
 */
export async function fetchRevenueAnalytics(
  range: AnalyticsRange = '30d'
): Promise<RevenueAnalyticsResponse> {
  const res = await apiFetch(`/api/admin/analytics/revenue?range=${encodeURIComponent(range)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch revenue analytics from database.');
  }
  return (await res.json()) as RevenueAnalyticsResponse;
}
