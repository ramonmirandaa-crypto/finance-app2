import { getMe } from './api';

let user = null;

export const auth = {
  clearLocal() {
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
