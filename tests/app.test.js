const request = require('supertest');
const app = require('../src/app');

describe('API endpoints', () => {
  it('GET /api/health should return API status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'API está funcionando perfeitamente!');
  });

  it('GET /api/version should return application version', async () => {
    const res = await request(app).get('/api/version');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('version');
  });
});
