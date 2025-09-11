import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";
import Pluggy from "pluggy-sdk";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import logger from "./logger.js";
import { createRequire } from "module";
import crypto from "crypto";
import speakeasy from "speakeasy";
import { getRate } from "./exchange.js";
import knex from "knex";
import knexConfig from "./knexfile.js";
import QRCode from "qrcode";

dotenv.config();
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}
if (!process.env.DATA_ENCRYPTION_KEY) {
  throw new Error("DATA_ENCRYPTION_KEY is not defined");
}
const require = createRequire(import.meta.url);
const { Pool } = pkg;
const knexClient = knex(knexConfig);

const pluggy = new Pluggy({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  baseUrl: process.env.PLUGGY_BASE_URL || "https://api.pluggy.ai",
});

const app = express();
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(require("pino-http")({ logger }));
app.use(helmet());

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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
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

const ENC_KEY = process.env.DATA_ENCRYPTION_KEY;

const RegisterSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  totp: z.string().length(6).optional(),
});

const TotpSchema = z.object({
  token: z.string().length(6),
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
  limit: z.number(),
});

const CategorySchema = z.object({
  name: z.string(),
});

const BudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  transactionId: z.string().optional(),
});

const GoalSchema = z.object({
  name: z.string(),
  target: z.number(),
  currency: z.string(),
  deadline: z.string().optional(),
  transactionId: z.string().optional(),
});

const InvestmentSchema = z.object({
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  transactionId: z.string().optional(),
});

const ReportSchema = z.object({
  name: z.string(),
  data: z.any().optional(),
});

const PluggyItemSchema = z.object({
  itemId: z.string(),
});

function signToken(user) {
  const payload = { sub: user.id, name: user.name, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || "";
  const match = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function getToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return getCookie(req, "token");
}

function authMiddleware(req, res, next) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "TOKEN_MISSING" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch {
    return res.status(401).json({ error: "TOKEN_INVALID" });
  }
  const csrfCookie = getCookie(req, "csrfToken");
  const csrfHeader = req.get("x-csrf-token");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: "CSRF_INVALID" });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({ status: "🚀 API rodando no TrueNAS!" });
});

app.get("/exchange/:base/:target", async (req, res) => {
  try {
    const rate = await getRate(
      req.params.base.toUpperCase(),
      req.params.target.toUpperCase()
    );
    res.json({ rate });
  } catch {
    res.status(500).json({ error: "EXCHANGE_FAILED" });
  }
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

    const csrfToken = crypto.randomBytes(20).toString("hex");
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.cookie("csrfToken", csrfToken, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(201).json({ user, token });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    if (String(e).includes("duplicate key")) {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Login
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password, totp } = await LoginSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      "SELECT id, name, email, password_hash, twofa_enabled, pgp_sym_decrypt(twofa_secret, $2) AS twofa_secret FROM users WHERE email = $1",
      [email.toLowerCase(), ENC_KEY]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    if (user.twofa_enabled) {
      if (!totp) return res.status(401).json({ error: "TOTP_REQUIRED" });
      const validTotp = speakeasy.totp.verify({ secret: user.twofa_secret, encoding: "base32", token: totp });
      if (!validTotp) return res.status(401).json({ error: "INVALID_TOTP" });
    }
    const token = signToken(user);
    const csrfToken = crypto.randomBytes(20).toString("hex");
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.cookie("csrfToken", csrfToken, {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.clearCookie("csrfToken");
  res.sendStatus(204);
});

app.post("/auth/2fa/setup", authMiddleware, async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: "Finance App" });
    await pool.query(
      "UPDATE users SET twofa_secret = pgp_sym_encrypt($1, $3, 'cipher-algo=aes256'), twofa_enabled = FALSE WHERE id = $2",
      [secret.base32, req.user.sub, ENC_KEY]
    );
    const qrcode = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ qrcode });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.post("/auth/2fa/verify", authMiddleware, async (req, res) => {
  try {
    const { token } = await TotpSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      "SELECT pgp_sym_decrypt(twofa_secret, $2) AS twofa_secret FROM users WHERE id = $1",
      [req.user.sub, ENC_KEY]
    );
    const secret = rows[0]?.twofa_secret;
    const ok = speakeasy.totp.verify({ secret, encoding: "base32", token });
    if (!ok) return res.status(400).json({ error: "INVALID_TOTP" });
    await pool.query(
      "UPDATE users SET twofa_enabled = TRUE WHERE id = $1",
      [req.user.sub]
    );
    res.json({});
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.delete("/auth/2fa", authMiddleware, async (req, res) => {
  try {
    const { token } = await TotpSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      "SELECT pgp_sym_decrypt(twofa_secret, $2) AS twofa_secret FROM users WHERE id = $1",
      [req.user.sub, ENC_KEY]
    );
    const secret = rows[0]?.twofa_secret;
    const ok = speakeasy.totp.verify({ secret, encoding: "base32", token });
    if (!ok) return res.status(400).json({ error: "INVALID_TOTP" });
    await pool.query(
      "UPDATE users SET twofa_secret = NULL, twofa_enabled = FALSE WHERE id = $1",
      [req.user.sub]
    );
    res.json({});
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
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
            RIGHT(pgp_sym_decrypt(account_number, $2), 4) AS number,
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
    logger.error(e);
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
    logger.error(e);
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
    const { number, expiration, limit } = await CardSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO cards (user_id, card_number, expiration, card_limit)
         VALUES ($1,
                 pgp_sym_encrypt($2, $5, 'cipher-algo=aes256'),
                 $3,
                 $4)
       RETURNING id,
                 RIGHT(pgp_sym_decrypt(card_number, $5), 4) AS number,
                 expiration,
                 card_limit AS limit`,
      [req.user.sub, number, expiration, limit, ENC_KEY]
    );
    res.status(201).json({ card: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
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
    const { number, expiration, limit } = await CardSchema.parseAsync(req.body);
    const result = await pool.query(
      `UPDATE cards SET
         card_number = pgp_sym_encrypt($3, $6, 'cipher-algo=aes256'),
         expiration = $4,
         card_limit = $5
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, number, expiration, limit, ENC_KEY]
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
    logger.error(e);
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

// Categories
app.get("/categories", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name FROM categories WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ categories: rows });
});

app.post("/categories", authMiddleware, async (req, res) => {
  try {
    const { name } = await CategorySchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO categories (user_id, name) VALUES ($1,$2) RETURNING id, name`,
      [req.user.sub, name]
    );
    res.status(201).json({ category: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Budgets
app.get("/budgets", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, category_id AS "categoryId", amount, currency, pluggy_transaction_id AS "transactionId"
       FROM budgets WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ budgets: rows });
});

app.post("/budgets", authMiddleware, async (req, res) => {
  try {
    const { categoryId, amount, currency, transactionId } = await BudgetSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, currency, pluggy_transaction_id)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, category_id AS "categoryId", amount, currency,
                   pluggy_transaction_id AS "transactionId"`,
      [req.user.sub, categoryId, amount, currency, transactionId]
    );
    res.status(201).json({ budget: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.put("/budgets/:id", authMiddleware, async (req, res) => {
  try {
    const { categoryId, amount, currency, transactionId } = await BudgetSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `UPDATE budgets SET category_id = $3, amount = $4, currency = $5, pluggy_transaction_id = $6
         WHERE id = $1 AND user_id = $2
         RETURNING id, category_id AS "categoryId", amount, currency, pluggy_transaction_id AS "transactionId"`,
      [req.params.id, req.user.sub, categoryId, amount, currency, transactionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ budget: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.delete("/budgets/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM budgets WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Goals
app.get("/goals", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, target, currency, deadline, pluggy_transaction_id AS "transactionId"
       FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ goals: rows });
});

app.post("/goals", authMiddleware, async (req, res) => {
  try {
    const { name, target, currency, deadline, transactionId } = await GoalSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO goals (user_id, name, target, currency, deadline, pluggy_transaction_id)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, name, target, currency, deadline, pluggy_transaction_id AS "transactionId"`,
      [req.user.sub, name, target, currency, deadline, transactionId]
    );
    res.status(201).json({ goal: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.put("/goals/:id", authMiddleware, async (req, res) => {
  try {
    const { name, target, currency, deadline, transactionId } = await GoalSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `UPDATE goals SET name = $3, target = $4, currency = $5, deadline = $6, pluggy_transaction_id = $7
         WHERE id = $1 AND user_id = $2
         RETURNING id, name, target, currency, deadline, pluggy_transaction_id AS "transactionId"`,
      [req.params.id, req.user.sub, name, target, currency, deadline, transactionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ goal: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.delete("/goals/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM goals WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Investments
app.get("/investments", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, description, amount, currency, pluggy_transaction_id AS "transactionId"
       FROM investments WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ investments: rows });
});

app.post("/investments", authMiddleware, async (req, res) => {
  try {
    const { description, amount, currency, transactionId } = await InvestmentSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO investments (user_id, description, amount, currency, pluggy_transaction_id)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, description, amount, currency, pluggy_transaction_id AS "transactionId"`,
      [req.user.sub, description, amount, currency, transactionId]
    );
    res.status(201).json({ investment: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.put("/investments/:id", authMiddleware, async (req, res) => {
  try {
    const { description, amount, currency, transactionId } = await InvestmentSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `UPDATE investments SET description = $3, amount = $4, currency = $5, pluggy_transaction_id = $6
         WHERE id = $1 AND user_id = $2
         RETURNING id, description, amount, currency, pluggy_transaction_id AS "transactionId"`,
      [req.params.id, req.user.sub, description, amount, currency, transactionId]
    );
    if (rows.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ investment: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.delete("/investments/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM investments WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Reports
app.get("/reports", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, data FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ reports: rows });
});

app.post("/reports", authMiddleware, async (req, res) => {
  try {
    const { name, data } = await ReportSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO reports (user_id, name, data) VALUES ($1,$2,$3) RETURNING id, name, data`,
      [req.user.sub, name, data]
    );
    res.status(201).json({ report: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

// Pluggy routes
app.post("/pluggy/link-token", authMiddleware, async (req, res) => {
  try {
    const { accessToken } = await pluggy.createConnectToken(undefined, {
      clientUserId: req.user.sub,
    });
    res.json({ linkToken: accessToken });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.post("/pluggy/items", authMiddleware, async (req, res) => {
  try {
    const { itemId } = await PluggyItemSchema.parseAsync(req.body);
    const item = await pluggy.fetchItem(itemId);
    await pool.query(
      `INSERT INTO pluggy_connectors (id, name)
         VALUES ($1,$2)
         ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name`,
      [item.connector.id, item.connector.name]
    );
    await pool.query(
      `INSERT INTO pluggy_items (id, user_id, connector_id, status, error, last_sync)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT(id) DO UPDATE SET user_id = EXCLUDED.user_id, connector_id = EXCLUDED.connector_id, status = EXCLUDED.status, error = EXCLUDED.error, last_sync = NOW()`,
      [
        item.id,
        req.user.sub,
        item.connector.id,
        item.status,
        item.error ? item.error.message : null,
      ]
    );
    const accountsResp = await pluggy.fetchAccounts(item.id);
    const accounts = accountsResp.results || accountsResp;
    for (const acc of accounts) {
      const balance = acc.balance && typeof acc.balance === 'object' ? acc.balance.current : acc.balance;
      await pool.query(
        `INSERT INTO pluggy_accounts (id, user_id, item_id, name, type, number, agency, balance, currency)
           VALUES ($1,$2,$3,$4,$5,
                   pgp_sym_encrypt($6, $10, 'cipher-algo=aes256'),
                   pgp_sym_encrypt($7, $10, 'cipher-algo=aes256'),
                   $8,$9)
           ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, number = EXCLUDED.number, agency = EXCLUDED.agency, balance = EXCLUDED.balance, currency = EXCLUDED.currency`,
        [
          acc.id,
          req.user.sub,
          item.id,
          acc.name,
          acc.type,
          acc.number || null,
          acc.branchNumber || acc.agency || null,
          balance,
          acc.currencyCode || acc.currency || null,
          ENC_KEY,
        ]
      );
    }
    const txResp = await pluggy.fetchTransactions(item.id);
    const txs = txResp.results || txResp;
    for (const tx of txs) {
      await pool.query(
        `INSERT INTO pluggy_transactions (id, user_id, item_id, account_id, description, amount, currency, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT(id) DO UPDATE SET account_id = EXCLUDED.account_id, description = EXCLUDED.description, amount = EXCLUDED.amount, currency = EXCLUDED.currency, date = EXCLUDED.date`,
        [
          tx.id,
          req.user.sub,
          item.id,
          tx.accountId,
          tx.description,
          tx.amount,
          tx.currencyCode || tx.currency,
          tx.date,
        ]
      );
    }
    res
      .status(201)
      .json({
        item: {
          id: item.id,
          connector: item.connector.name,
          status: item.status,
          error: item.error ? item.error.message : null,
        },
      });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.get("/pluggy/items", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT i.id, c.name AS connector, i.status, i.error
       FROM pluggy_items i
       JOIN pluggy_connectors c ON c.id = i.connector_id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
    [req.user.sub]
  );
  res.json({ items: rows });
});

app.get("/pluggy/accounts", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, item_id AS "itemId", name, type,
            pgp_sym_decrypt(number, $2) AS number,
            pgp_sym_decrypt(agency, $2) AS agency,
            balance, currency
       FROM pluggy_accounts
       WHERE user_id = $1
       ORDER BY name`,
    [req.user.sub, ENC_KEY]
  );
  res.json({ accounts: rows });
});

app.get("/pluggy/transactions", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, item_id AS "itemId", account_id AS "accountId", description, amount, currency, date
       FROM pluggy_transactions
       WHERE user_id = $1
       ORDER BY date DESC`,
    [req.user.sub]
  );
  res.json({ transactions: rows });
});

app.post("/pluggy/items/:id/sync", authMiddleware, async (req, res) => {
  try {
    await pluggy.updateItem(req.params.id);
    const item = await pluggy.fetchItem(req.params.id);
    const accountsResp = await pluggy.fetchAccounts(req.params.id);
    const accounts = accountsResp.results || accountsResp;
    for (const acc of accounts) {
      const balance = acc.balance && typeof acc.balance === 'object' ? acc.balance.current : acc.balance;
      await pool.query(
        `INSERT INTO pluggy_accounts (id, user_id, item_id, name, type, number, agency, balance, currency)
           VALUES ($1,$2,$3,$4,$5,
                   pgp_sym_encrypt($6, $10, 'cipher-algo=aes256'),
                   pgp_sym_encrypt($7, $10, 'cipher-algo=aes256'),
                   $8,$9)
           ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, number = EXCLUDED.number, agency = EXCLUDED.agency, balance = EXCLUDED.balance, currency = EXCLUDED.currency`,
        [
          acc.id,
          req.user.sub,
          req.params.id,
          acc.name,
          acc.type,
          acc.number || null,
          acc.branchNumber || acc.agency || null,
          balance,
          acc.currencyCode || acc.currency || null,
          ENC_KEY,
        ]
      );
    }
    const txResp = await pluggy.fetchTransactions(req.params.id);
    const txs = txResp.results || txResp;
    for (const tx of txs) {
      await pool.query(
        `INSERT INTO pluggy_transactions (id, user_id, item_id, account_id, description, amount, currency, date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT(id) DO UPDATE SET account_id = EXCLUDED.account_id, description = EXCLUDED.description, amount = EXCLUDED.amount, currency = EXCLUDED.currency, date = EXCLUDED.date`,
        [
          tx.id,
          req.user.sub,
          req.params.id,
          tx.accountId,
          tx.description,
          tx.amount,
          tx.currencyCode || tx.currency,
          tx.date,
        ]
      );
    }
    await pool.query(
      `UPDATE pluggy_items SET status = $1, error = $2, last_sync = NOW() WHERE id = $3 AND user_id = $4`,
      [item.status, item.error ? item.error.message : null, req.params.id, req.user.sub]
    );
    res.status(200).json({ status: item.status });
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

app.post("/pluggy/webhook", async (req, res) => {
  const signature = req.get("x-pluggy-signature");
  const secret = process.env.PLUGGY_WEBHOOK_SECRET || "";
  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody || "")
    .digest("base64");
  if (
    !signature ||
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return res.status(401).json({ error: "INVALID_SIGNATURE" });
  }

  const { itemId } = req.body || {};
  if (!itemId) return res.status(400).json({ error: "INVALID_BODY" });
  try {
    const item = await pluggy.fetchItem(itemId);
    if (!item.clientUserId) return res.status(200).json({});
    await pool.query(
      `INSERT INTO pluggy_connectors (id, name)
         VALUES ($1,$2)
         ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name`,
      [item.connector.id, item.connector.name]
    );
    await pool.query(
      `INSERT INTO pluggy_items (id, user_id, connector_id, status, error, last_sync)
         VALUES ($1,$2,$3,$4,$5,NOW())
         ON CONFLICT(id) DO UPDATE SET user_id = EXCLUDED.user_id, connector_id = EXCLUDED.connector_id, status = EXCLUDED.status, error = EXCLUDED.error, last_sync = NOW()`,
      [
        item.id,
        item.clientUserId,
        item.connector.id,
        item.status,
        item.error ? item.error.message : null,
      ]
    );
    res.json({});
  } catch (e) {
    logger.error(e);
    res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

const PORT = process.env.PORT || 4000;

// Evita iniciar o servidor automaticamente durante os testes
if (process.env.NODE_ENV !== "test") {
  knexClient.migrate.latest().then(() => {
    app.listen(PORT, () => logger.info(`API online na porta ${PORT}`));
  });
}

export { app, pool };
export default app;
