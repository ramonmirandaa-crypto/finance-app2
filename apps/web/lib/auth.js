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
  save(_token) {
    // Token is stored in httpOnly cookie by the server
  },
  get() {
    if (typeof document !== 'undefined') {
      const match = document.cookie
        ?.split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('token='));
      return match ? match.slice(6) : null;
    }
    return null;
  },
  clear() {
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; Max-Age=0; path=/';
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
