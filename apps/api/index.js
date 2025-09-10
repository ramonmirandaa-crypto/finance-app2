import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";
import Pluggy from "pluggy-js";

dotenv.config();
const { Pool } = pkg;

const pluggy = new Pluggy({
  clientId: process.env.PLUGGY_CLIENT_ID || "",
  clientSecret: process.env.PLUGGY_CLIENT_SECRET || "",
});

const app = express();
app.use(express.json());

// CORS restrito à origem do seu frontend
app.use((req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Conexão Postgres (serviço "db" do docker-compose)
const pool = new Pool({
  host: process.env.DB_HOST || "db",
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME || "finance",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

const ENC_KEY = process.env.DATA_ENCRYPTION_KEY || "devkey";

// Cria extensão e tabela users se não existirem
async function ensureSchema() {
  try { await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";'); } catch (_) {}
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      agency TEXT NOT NULL,
      account_number BYTEA NOT NULL,
      manager BYTEA,
      phone BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      card_number BYTEA NOT NULL,
      expiration TEXT NOT NULL,
      cvc BYTEA NOT NULL,
      card_limit NUMERIC NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pluggy_connectors (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pluggy_items (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      connector_id INTEGER REFERENCES pluggy_connectors(id),
      status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function signToken(user) {
  const payload = { sub: user.id, name: user.name, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET || "devsecret", { expiresIn: "7d" });
}

function authMiddleware(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: "TOKEN_MISSING" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALID" });
  }
}

app.get("/", (req, res) => {
  res.json({ status: "🚀 API rodando no TrueNAS!" });
});

// Registro
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at",
      [name, email.toLowerCase(), hash]
    );
    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (e) {
    if (String(e).includes("duplicate key")) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    const token = signToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Perfil
app.get("/me", authMiddleware, async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, email, created_at FROM users WHERE id = $1", [req.user.sub]);
  res.json({ user: rows[0] || null });
});

// Accounts CRUD
app.get("/accounts", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, agency,
            pgp_sym_decrypt(account_number, $2) AS number,
            pgp_sym_decrypt(manager, $2) AS manager,
            pgp_sym_decrypt(phone, $2) AS phone
       FROM accounts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
    [req.user.sub, ENC_KEY]
  );
  res.json({ accounts: rows });
});

app.post("/accounts", authMiddleware, async (req, res) => {
  try {
    const { agency, number, manager, phone } = req.body || {};
    if (!agency || !number) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const { rows } = await pool.query(
      `INSERT INTO accounts (user_id, agency, account_number, manager, phone)
         VALUES ($1, $2,
                 pgp_sym_encrypt($3, $6, 'cipher-algo=aes256'),
                 pgp_sym_encrypt($4, $6, 'cipher-algo=aes256'),
                 pgp_sym_encrypt($5, $6, 'cipher-algo=aes256'))
       RETURNING id, agency,
                 pgp_sym_decrypt(account_number, $6) AS number,
                 pgp_sym_decrypt(manager, $6) AS manager,
                 pgp_sym_decrypt(phone, $6) AS phone`,
      [req.user.sub, agency, number, manager, phone, ENC_KEY]
    );
    res.status(201).json({ account: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.get("/accounts/:id", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, agency,
            pgp_sym_decrypt(account_number, $3) AS number,
            pgp_sym_decrypt(manager, $3) AS manager,
            pgp_sym_decrypt(phone, $3) AS phone
       FROM accounts
       WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.sub, ENC_KEY]
  );
  const account = rows[0];
  if (!account) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ account });
});

app.put("/accounts/:id", authMiddleware, async (req, res) => {
  try {
    const { agency, number, manager, phone } = req.body || {};
    if (!agency || !number) return res.status(400).json({ error: "VALIDATION_ERROR" });
    const result = await pool.query(
      `UPDATE accounts SET
         agency = $3,
         account_number = pgp_sym_encrypt($4, $7, 'cipher-algo=aes256'),
         manager = pgp_sym_encrypt($5, $7, 'cipher-algo=aes256'),
         phone = pgp_sym_encrypt($6, $7, 'cipher-algo=aes256')
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, agency, number, manager, phone, ENC_KEY]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    const { rows } = await pool.query(
      `SELECT id, agency,
              pgp_sym_decrypt(account_number, $3) AS number,
              pgp_sym_decrypt(manager, $3) AS manager,
              pgp_sym_decrypt(phone, $3) AS phone
         FROM accounts
         WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, ENC_KEY]
    );
    res.json({ account: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.delete("/accounts/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM accounts WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Cards CRUD
app.get("/cards", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id,
            pgp_sym_decrypt(card_number, $2) AS number,
            expiration,
            pgp_sym_decrypt(cvc, $2) AS cvc,
            card_limit AS limit
       FROM cards
       WHERE user_id = $1
       ORDER BY created_at DESC`,
    [req.user.sub, ENC_KEY]
  );
  res.json({ cards: rows });
});

app.post("/cards", authMiddleware, async (req, res) => {
  try {
    const { number, expiration, cvc, limit } = req.body || {};
    if (!number || !expiration || !cvc || limit == null) {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }
    const { rows } = await pool.query(
      `INSERT INTO cards (user_id, card_number, expiration, cvc, card_limit)
         VALUES ($1,
                 pgp_sym_encrypt($2, $6, 'cipher-algo=aes256'),
                 $3,
                 pgp_sym_encrypt($4, $6, 'cipher-algo=aes256'),
                 $5)
       RETURNING id,
                 pgp_sym_decrypt(card_number, $6) AS number,
                 expiration,
                 pgp_sym_decrypt(cvc, $6) AS cvc,
                 card_limit AS limit`,
      [req.user.sub, number, expiration, cvc, limit, ENC_KEY]
    );
    res.status(201).json({ card: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.get("/cards/:id", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id,
            pgp_sym_decrypt(card_number, $3) AS number,
            expiration,
            pgp_sym_decrypt(cvc, $3) AS cvc,
            card_limit AS limit
       FROM cards
       WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.sub, ENC_KEY]
  );
  const card = rows[0];
  if (!card) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ card });
});

app.put("/cards/:id", authMiddleware, async (req, res) => {
  try {
    const { number, expiration, cvc, limit } = req.body || {};
    if (!number || !expiration || !cvc || limit == null) {
      return res.status(400).json({ error: "VALIDATION_ERROR" });
    }
    const result = await pool.query(
      `UPDATE cards SET
         card_number = pgp_sym_encrypt($3, $7, 'cipher-algo=aes256'),
         expiration = $4,
         cvc = pgp_sym_encrypt($5, $7, 'cipher-algo=aes256'),
         card_limit = $6
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, number, expiration, cvc, limit, ENC_KEY]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    const { rows } = await pool.query(
      `SELECT id,
              pgp_sym_decrypt(card_number, $3) AS number,
              expiration,
              pgp_sym_decrypt(cvc, $3) AS cvc,
              card_limit AS limit
         FROM cards
         WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, ENC_KEY]
    );
    res.json({ card: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.delete("/cards/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM cards WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Open Finance / Pluggy endpoints
app.get("/pluggy/connectors", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, name FROM pluggy_connectors ORDER BY id"
    );
    if (rows.length === 0) {
      const { results } = await pluggy.fetchConnectors();
      for (const c of results) {
        await pool.query(
          "INSERT INTO pluggy_connectors (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name",
          [c.id, c.name]
        );
      }
      return res.json({ connectors: results });
    }
    res.json({ connectors: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.post("/pluggy/link-token", authMiddleware, async (req, res) => {
  try {
    const { accessToken } = await pluggy.createConnectToken(undefined, {
      clientUserId: req.user.sub,
      webhookUrl: process.env.PLUGGY_WEBHOOK_URL,
    });
    res.json({ accessToken });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.get("/pluggy/items", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, connector_id, status FROM pluggy_items WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user.sub]
  );
  res.json({ items: rows });
});

app.post("/pluggy/items/:id/sync", authMiddleware, async (req, res) => {
  try {
    const item = await pluggy.fetchItem(req.params.id);
    await pool.query(
      "UPDATE pluggy_items SET status = $2, connector_id = $3, updated_at = NOW() WHERE id = $1 AND user_id = $4",
      [item.id, item.status, item.connector.id, req.user.sub]
    );
    res.json({ item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.post("/pluggy/webhook", async (req, res) => {
  try {
    const { item } = req.body || {};
    if (item) {
      await pool.query(
        "INSERT INTO pluggy_connectors (id, name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name",
        [item.connector.id, item.connector.name]
      );
      await pool.query(
        `INSERT INTO pluggy_items (id, user_id, connector_id, status)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, connector_id=EXCLUDED.connector_id, updated_at=NOW()`,
        [item.id, item.clientUserId, item.connector.id, item.status]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

const PORT = process.env.PORT || 4000;
ensureSchema().then(() => {
  app.listen(PORT, () => console.log(`API online na porta ${PORT}`));
});
