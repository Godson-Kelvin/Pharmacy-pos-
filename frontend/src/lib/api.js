// In dev, Vite proxies /api to http://localhost:5000 (see vite.config.js),
// so the frontend can use the same /api base everywhere — no CORS in dev either.
// In production (Vercel), the serverless function is at /api on the same origin.
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(path, options = {}) {
  const headers = { ...options.headers };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    const isLoginPage = window.location.pathname === '/login';
    const isAuthCheck = path === '/auth/me';
    if (!isLoginPage && !isAuthCheck) {
      window.location.href = '/login';
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Session expired');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('text/csv')) {
    return res;
  }

  return res.json();
}

export const api = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  getMe: () => request('/auth/me'),

  getUsers: () => request('/auth/users'),
  createUser: (data) => request('/auth/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getProducts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  getCategories: () => request('/products/categories'),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  importProducts: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/products/import', { method: 'POST', body: formData });
  },

  getSales: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sales${query ? `?${query}` : ''}`);
  },
  getStats: (period = '7') => request(`/sales/stats?period=${period}`),
  createSale: (data) => request('/sales', { method: 'POST', body: JSON.stringify(data) }),
  exportSales: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/sales/export${query ? `?${query}` : ''}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}
