function getApiBase(): string {
  const envUrl = (
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '')
      : ''
  ).replace(/\/*$/, '').replace(/\/api$/, '');

  // If in browser and envUrl is an unreachable internal/private IP or empty, use same-origin relative path
  if (typeof window !== 'undefined') {
    const isPrivateInternalIp =
      /^https?:\/\/(100\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(envUrl);
    if (!envUrl || isPrivateInternalIp) {
      return '';
    }
  }
  return envUrl;
}

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url || url === '/favicon.svg') {
    return url || '/favicon.svg';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return '/favicon.svg';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  const apiBase = getApiBase();

  // If starts with /uploads/
  if (trimmed.startsWith('/uploads/')) {
    return apiBase ? `${apiBase}${trimmed}` : trimmed;
  }

  // If starts with uploads/ or ./uploads/ without leading slash
  if (trimmed.startsWith('uploads/') || trimmed.startsWith('./uploads/')) {
    const clean = '/' + trimmed.replace(/^\.?\/?/, '');
    return apiBase ? `${apiBase}${clean}` : clean;
  }

  // Relative frontend assets: /products/, products/, /banners/, banners/, /assets/, assets/, /favicon.svg
  if (
    trimmed.startsWith('/products/') ||
    trimmed.startsWith('/banners/') ||
    trimmed.startsWith('/assets/')
  ) {
    return trimmed;
  }

  if (
    trimmed.startsWith('products/') ||
    trimmed.startsWith('banners/') ||
    trimmed.startsWith('assets/') ||
    trimmed.startsWith('public/')
  ) {
    return '/' + trimmed.replace(/^public\//, '').replace(/^\/+/, '');
  }

  if (trimmed.startsWith('/') && trimmed !== '/favicon.svg') {
    return trimmed;
  }

  // Bare uploaded filename from DB (e.g. "foner_1791122631105.jpg", "avatar_1_....png")
  const uploadPath = `/uploads/${trimmed.replace(/^\/+/, '')}`;
  return apiBase ? `${apiBase}${uploadPath}` : uploadPath;
}
