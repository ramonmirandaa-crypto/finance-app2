export default class Pluggy {
  constructor() {}

  async createConnectToken() {
    return { accessToken: 'mock-token' };
  }

  async fetchItem(id) {
    return {
      id,
      status: 'UPDATED',
      connector: { id: 1, name: 'Mock Bank' },
      error: null,
      clientUserId: 'user-1',
    };
  }

  async updateItem() {
    return {};
  }
}
