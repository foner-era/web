const API_BASE = (
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '')
    : ''
).replace(/\/*$/, '').replace(/\/api$/, '');

export function resolveImageUrl(url: string | null | undefined | undefined): string {
  if (!url || url === '/favicon.svg') {
    return url || '/favicon.svg';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('data:image/')) {
    return url;
  }
  if (url.startsWith('/') && url !== '/favicon.svg') {
    if (url.startsWith('/uploads/')) {
      return API_BASE ? `${API_BASE}${url}` : url;
    }
    return url;
  }
  // Bare filename from DB (e.g., avatar filename without /uploads/ prefix)
  const uploadPath = url ? `/uploads/${url}` : url;
  return API_BASE ? `${API_BASE}${uploadPath}` : uploadPath;
}
