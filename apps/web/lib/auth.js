import { getMe } from './api';

let user = null;

export const auth = {
  save() {
    // Token is stored in httpOnly cookie by the server
  },
  clear() {
    if (typeof document !== 'undefined') {
      document.cookie = 'token=; Max-Age=0; path=/';
    }
    user = null;
  },
  async getUser(force = false) {
    if (user && !force) return user;
    const { user: u } = await getMe();
    user = u;
    return u;
  },
  async isAuthenticated() {
    try {
      await this.getUser();
      return true;
    } catch (e) {
      if (e.status === 401) return false;
      throw e;
    }
  }
};
