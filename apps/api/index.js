import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";
import Pluggy from "pluggy-sdk";
import { z } from "zod";
import rateLimit from "express-rate-limit";

dotenv.config();
const { Pool } = pkg;

const pluggy = new Pluggy({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  baseUrl: process.env.PLUGGY_BASE_URL || "https://api.pluggy.ai",
});

const app = express();
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (_req, res) => res.status(429).json({ error: "Too Many Requests" }),
});

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

const RegisterSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const AccountSchema = z.object({
  agency: z.string(),
  number: z.string(),
  manager: z.string().optional(),
  phone: z.string().optional(),
});

const CardSchema = z.object({
  number: z.string(),
  expiration: z.string(),
  cvc: z.string(),
  limit: z.number(),
});

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
app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = await RegisterSchema.parseAsync(req.body);
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at",
      [name, email.toLowerCase(), hash]
    );
    const user = rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    if (String(e).includes("duplicate key")) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Login
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = await LoginSchema.parseAsync(req.body);
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    const token = signToken(user);
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
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
    const { agency, number, manager, phone } = await AccountSchema.parseAsync(req.body);
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
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
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
    const { agency, number, manager, phone } = await AccountSchema.parseAsync(req.body);
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
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
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
            RIGHT(pgp_sym_decrypt(card_number, $2), 4) AS number,
            expiration,
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
    const { number, expiration, cvc, limit } = await CardSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO cards (user_id, card_number, expiration, cvc, card_limit)
         VALUES ($1,
                 pgp_sym_encrypt($2, $6, 'cipher-algo=aes256'),
                 $3,
                 digest($4, 'sha256'),
                 $5)
       RETURNING id,
                 RIGHT(pgp_sym_decrypt(card_number, $6), 4) AS number,
                 expiration,
                 card_limit AS limit`,
      [req.user.sub, number, expiration, cvc, limit, ENC_KEY]
    );
    res.status(201).json({ card: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    console.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.get("/cards/:id", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id,
            RIGHT(pgp_sym_decrypt(card_number, $3), 4) AS number,
            expiration,
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
    const { number, expiration, cvc, limit } = await CardSchema.parseAsync(req.body);
    const result = await pool.query(
      `UPDATE cards SET
         card_number = pgp_sym_encrypt($3, $7, 'cipher-algo=aes256'),
         expiration = $4,
         cvc = digest($5, 'sha256'),
         card_limit = $6
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, number, expiration, cvc, limit, ENC_KEY]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    const { rows } = await pool.query(
      `SELECT id,
              RIGHT(pgp_sym_decrypt(card_number, $3), 4) AS number,
              expiration,
              card_limit AS limit
         FROM cards
         WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, ENC_KEY]
    );
    res.json({ card: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
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

const PORT = process.env.PORT || 4000;
ensureSchema().then(() => {
  app.listen(PORT, () => console.log(`API online na porta ${PORT}`));
});
