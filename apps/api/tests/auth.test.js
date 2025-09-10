import request from 'supertest';

process.env.NODE_ENV = 'test';

let app, pool, ensureSchema;

beforeAll(async () => {
  ({ app, pool, ensureSchema } = await import('../index.js'));
  await ensureSchema();
});

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('Auth endpoints', () => {
  describe('POST /auth/register', () => {
    it('registers a user', async () => {
      const res = await request(app).post('/auth/register').send({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'secret',
      });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('token');
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'jane@example.com',
      });
      expect(res.status).toBe(400);
    });

    it('rejects duplicate email', async () => {
      await request(app).post('/auth/register').send({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'secret',
      });
      const res = await request(app).post('/auth/register').send({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'secret',
      });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /auth/login', () => {
    it('logs in a user', async () => {
      await request(app).post('/auth/register').send({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'secret',
      });
      const res = await request(app).post('/auth/login').send({
        email: 'jane@example.com',
        password: 'secret',
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({ email: 'jane@example.com', name: 'Jane' });
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'jane@example.com' });
      expect(res.status).toBe(400);
    });

    it('rejects invalid credentials', async () => {
      await request(app).post('/auth/register').send({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'secret',
      });
      const res = await request(app).post('/auth/login').send({
        email: 'jane@example.com',
        password: 'wrong',
      });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /me', () => {
    it('returns profile with valid token', async () => {
      await request(app).post('/auth/register').send({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'secret',
      });
      const login = await request(app).post('/auth/login').send({
        email: 'jane@example.com',
        password: 'secret',
      });
      const token = login.body.token;
      const res = await request(app).get('/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('jane@example.com');
    });

    it('requires auth token', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
    });
  });
});
