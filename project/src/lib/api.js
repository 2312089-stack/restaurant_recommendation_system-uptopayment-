const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

const normalizeApiBaseUrl = (value) => {
  if (!value) {
    if (import.meta.env.PROD) {
      return 'https://tastesphere-hy30.onrender.com/api';
    }
    return 'http://localhost:5000/api';
  }

  const sanitizedValue = value.replace(/\/+$/, '');
  return sanitizedValue.endsWith('/api') ? sanitizedValue : `${sanitizedValue}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(rawApiUrl);

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
