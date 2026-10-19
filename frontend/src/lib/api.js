const TOKEN_KEY = 'hero.token';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', fields = {} } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Сервер недоступен. Проверьте подключение и попробуйте ещё раз.', {
      status: 0,
      code: 'network_error',
    });
  }

  const raw = await response.text();
  let payload = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = null;
    }
  }

  if (!response.ok || !payload?.ok) {
    const error = payload?.error || {};
    if (response.status === 401 && getToken()) {
      // Сессия истекла: дальнейшие запросы без токена не имеют смысла.
      window.dispatchEvent(new CustomEvent('hero:unauthorized'));
    }
    throw new ApiError(error.message || 'Не удалось выполнить запрос', {
      status: response.status,
      code: error.code || 'http_error',
      fields: error.fields || {},
    });
  }

  return payload.data;
}

const query = (params) => {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const string = search.toString();
  return string ? `?${string}` : '';
};

export const api = {
  auth: {
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    login: (data) => request('/auth/login', { method: 'POST', body: data }),
    me: () => request('/auth/me'),
    changePassword: (data) => request('/auth/password', { method: 'POST', body: data }),
  },
  profile: {
    update: (data) => request('/profile', { method: 'PATCH', body: data }),
    summary: () => request('/profile/summary'),
  },
  practice: {
    catalog: () => request('/practice/catalog'),
    text: (params, signal) => request(`/practice/text${query(params)}`, { signal }),
    saveSession: (data) => request('/practice/sessions', { method: 'POST', body: data }),
  },
  stats: {
    overview: () => request('/stats/overview'),
    daily: (days = 14) => request(`/stats/daily${query({ days })}`),
    characters: (params) => request(`/stats/characters${query(params)}`),
    sessions: (limit = 10) => request(`/stats/sessions${query({ limit })}`),
    activity: () => request('/stats/activity'),
  },
  leaderboard: (params) => request(`/leaderboard${query(params)}`),
  achievements: () => request('/achievements'),
};

export { API_BASE };
