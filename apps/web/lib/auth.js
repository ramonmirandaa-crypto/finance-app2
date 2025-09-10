function decodePayload(token) {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json || null;
  } catch {
    return null;
  }
}

export const auth = {
  save(token) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
    }
  },
  get() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  },
  clear() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  },
  getUser() {
    const t = this.get();
    if (!t) return null;
    const payload = decodePayload(t);
    if (!payload) return null;
    return { id: payload.sub, name: payload.name, email: payload.email, exp: payload.exp };
  },
  isAuthenticated() {
    const u = this.getUser();
    if (!u) return false;
    if (u.exp && Date.now() / 1000 > u.exp) {
      this.clear();
      return false;
    }
    return true;
  }
};
