// Thin wrapper around fetch() for talking to the Chronicle backend.
// Change API_BASE if the backend is deployed somewhere other than localhost.
const API_BASE = window.CHRONICLE_API_BASE || 'http://localhost:4000/api';

const Api = (() => {
  function getToken() {
    return localStorage.getItem('chronicle_token');
  }

  async function request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (networkErr) {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }

    let data = null;
    try {
      data = await response.json();
    } catch (_) {
      // no body (e.g. 204 No Content) - that's fine
    }

    if (!response.ok) {
      throw new Error((data && data.error) || `Request failed (${response.status}).`);
    }
    return data;
  }

  return {
    register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
    me: () => request('/auth/me'),

    listTasks: () => request('/tasks'),
    createTask: (payload) => request('/tasks', { method: 'POST', body: payload }),
    updateTask: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),
    deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
    completeTask: (id) => request(`/tasks/${id}/complete`, { method: 'POST' }),
    recentLogs: () => request('/tasks/logs/recent'),

    listShop: () => request('/shop'),
    buyItem: (id) => request(`/shop/${id}/buy`, { method: 'POST' })
  };
})();
