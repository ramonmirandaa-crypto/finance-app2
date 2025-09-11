import express from "express";
import dotenv from "dotenv";
import pkg from "pg";
import { z } from "zod";
import helmet from "helmet";
import logger from "./logger.js";
import { createRequire } from "module";
import { getRate } from "./exchange.js";
import knex from "knex";
import knexConfig from "./knexfile.js";
import jwt from "jsonwebtoken";

import createAuthRoutes from "./routes/auth.js";
import createAccountsRoutes from "./routes/accounts.js";
import createPluggyRoutes from "./services/pluggy.js";
import { initScheduler } from "./tasks/scheduler.js";

dotenv.config();
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'test') {
    process.env.JWT_SECRET = 'devsecret';
  } else {
    throw new Error("JWT_SECRET is not defined");
  }
}
if (!process.env.DATA_ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === 'test') {
    process.env.DATA_ENCRYPTION_KEY = 'testkey';
  } else {
    throw new Error("DATA_ENCRYPTION_KEY is not defined");
  }
}
const require = createRequire(import.meta.url);
const { Pool } = pkg;
const knexClient = knex(knexConfig);

const app = express();
app.use(
  express.json({
    limit: process.env.JSON_LIMIT || '1mb', // adjust if large payloads are expected
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(require("pino-http")({ logger }));
app.use(helmet());

// CORS restrito à origem do seu frontend
app.use((req, res, next) => {
  const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-csrf-token'
  );
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

const CardSchema = z.object({
  number: z.string(),
  expiration: z.string(),
  limit: z.number(),
});

const CategorySchema = z.object({
  name: z.string(),
});

const TransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  description: z.string().optional(),
});

const ScheduledTransactionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  date: z.string(),
  executeAt: z.string(),
  description: z.string().optional(),
});

const RecurringSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  intervalDays: z.number(),
  nextOccurrence: z.string(),
  description: z.string().optional(),
});

const SubscriptionSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  service: z.string(),
  amount: z.number(),
  currency: z.string(),
  nextBillingDate: z.string(),
});

const BudgetSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number(),
  currency: z.string(),
  transactionId: z.string().optional(),
});
// Notifications
async function createNotification(userId, type, message) {
  await pool.query(
    `INSERT INTO notifications (user_id, type, message) VALUES ($1,$2,$3)`,
    [userId, type, message]
  );
}

async function checkBudget(userId, categoryId) {
  if (!categoryId) return;
  const { rows: budgets } = await pool.query(
    `SELECT id, amount FROM budgets WHERE user_id = $1 AND category_id = $2`,
    [userId, categoryId]
  );
  if (budgets.length === 0) return;
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE user_id = $1 AND category_id = $2`,
    [userId, categoryId]
  );
  const total = Number(rows[0]?.total) || 0;
  for (const b of budgets) {
    if (total > Number(b.amount)) {
      await createNotification(
        userId,
        'budget_exceeded',
        'Orçamento excedido'
      );
    }
  }
}

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

const LoanSchema = z.object({
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  interestRate: z.number(),
  startDate: z.string(),
  endDate: z.string(),
});

const LoanPaymentSchema = z.object({
  amount: z.number(),
  paidAt: z.string(),
});

const ReportSchema = z.object({
  name: z.string(),
  data: z.any().optional(),
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
app.use("/auth", createAuthRoutes({ pool, authMiddleware, ENC_KEY }));

// Perfil
app.get("/me", authMiddleware, async (req, res) => {
  const { rows } = await pool.query("SELECT id, name, email, created_at FROM users WHERE id = $1", [req.user.sub]);
  res.json({ user: rows[0] || null });
});

app.get("/notifications", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, type, message, read_at AS "readAt" FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ notifications: rows });
});

app.post("/notifications/:id/read", authMiddleware, async (req, res) => {
  await pool.query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.sub]
  );
  res.json({});
});

// Accounts CRUD
app.use("/accounts", createAccountsRoutes({ pool, authMiddleware, ENC_KEY }));

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

app.post("/cards", authMiddleware, async (req, res, next) => {
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
    return next(e);
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

app.put("/cards/:id", authMiddleware, async (req, res, next) => {
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
    return next(e);
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

app.post("/categories", authMiddleware, async (req, res, next) => {
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
    return next(e);
  }
});

// Transactions
app.get("/transactions", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency, date,
            pgp_sym_decrypt(description, $2) AS description
       FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC`,
    [req.user.sub, ENC_KEY]
  );
  res.json({ transactions: rows });
});

app.post("/transactions", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, type, amount, currency, date, description } =
      await TransactionSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO transactions (user_id, account_id, category_id, type, amount, currency, date, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7, pgp_sym_encrypt($8, $9, 'cipher-algo=aes256'))
         RETURNING id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency, date,
                   pgp_sym_decrypt(description, $9) AS description`,
      [req.user.sub, accountId, categoryId, type, amount, currency, date, description, ENC_KEY]
    );
    await checkBudget(req.user.sub, categoryId);
    res.status(201).json({ transaction: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.put("/transactions/:id", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, type, amount, currency, date, description } =
      await TransactionSchema.parseAsync(req.body);
    const result = await pool.query(
      `UPDATE transactions SET account_id = $3, category_id = $4, type = $5, amount = $6, currency = $7, date = $8,
              description = pgp_sym_encrypt($9, $10, 'cipher-algo=aes256')
         WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, accountId, categoryId, type, amount, currency, date, description, ENC_KEY]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
    const { rows } = await pool.query(
      `SELECT id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency, date,
              pgp_sym_decrypt(description, $3) AS description
         FROM transactions
         WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.sub, ENC_KEY]
    );
    res.json({ transaction: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.delete("/transactions/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Recurrings
app.get("/recurrings", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency,
            interval_days AS "intervalDays", next_occurrence AS "nextOccurrence",
            pgp_sym_decrypt(description, $2) AS description
       FROM recurrings
       WHERE user_id = $1
       ORDER BY next_occurrence ASC`,
    [req.user.sub, ENC_KEY]
  );
  res.json({ recurrings: rows });
});

app.post("/recurrings", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, type, amount, currency, intervalDays, nextOccurrence, description } =
      await RecurringSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO recurrings (user_id, account_id, category_id, type, amount, currency, interval_days, next_occurrence, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, pgp_sym_encrypt($9, $10, 'cipher-algo=aes256'))
         RETURNING id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency,
                   interval_days AS "intervalDays", next_occurrence AS "nextOccurrence",
                   pgp_sym_decrypt(description,$10) AS description`,
      [req.user.sub, accountId, categoryId, type, amount, currency, intervalDays, nextOccurrence, description, ENC_KEY]
    );
    res.status(201).json({ recurring: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.put("/recurrings/:id", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, type, amount, currency, intervalDays, nextOccurrence, description } =
      await RecurringSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `UPDATE recurrings SET account_id = $3, category_id = $4, type = $5, amount = $6, currency = $7,
              interval_days = $8, next_occurrence = $9,
              description = pgp_sym_encrypt($10, $11, 'cipher-algo=aes256')
         WHERE id = $1 AND user_id = $2
         RETURNING id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency,
                   interval_days AS "intervalDays", next_occurrence AS "nextOccurrence",
                   pgp_sym_decrypt(description,$11) AS description`,
      [req.params.id, req.user.sub, accountId, categoryId, type, amount, currency, intervalDays, nextOccurrence, description, ENC_KEY]
    );
    if (rows.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ recurring: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.delete("/recurrings/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM recurrings WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Scheduled Transactions
app.get("/scheduled-transactions", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency, date,
            execute_at AS "executeAt", pgp_sym_decrypt(description, $2) AS description
       FROM scheduled_transactions
       WHERE user_id = $1
       ORDER BY execute_at ASC`,
    [req.user.sub, ENC_KEY]
  );
  res.json({ scheduledTransactions: rows });
});

app.post("/scheduled-transactions", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, type, amount, currency, date, executeAt, description } =
      await ScheduledTransactionSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO scheduled_transactions (user_id, account_id, category_id, type, amount, currency, date, execute_at, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, pgp_sym_encrypt($9,$10,'cipher-algo=aes256'))
         RETURNING id, account_id AS "accountId", category_id AS "categoryId", type, amount, currency, date,
                   execute_at AS "executeAt", pgp_sym_decrypt(description,$10) AS description`,
      [req.user.sub, accountId, categoryId, type, amount, currency, date, executeAt, description, ENC_KEY]
    );
    res.status(201).json({ scheduledTransaction: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.delete("/scheduled-transactions/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM scheduled_transactions WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
});

// Subscriptions
app.get("/subscriptions", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, account_id AS "accountId", category_id AS "categoryId", service, amount, currency,
            next_billing_date AS "nextBillingDate"
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY next_billing_date ASC`,
    [req.user.sub]
  );
  res.json({ subscriptions: rows });
});

app.post("/subscriptions", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, service, amount, currency, nextBillingDate } =
      await SubscriptionSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO subscriptions (user_id, account_id, category_id, service, amount, currency, next_billing_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, account_id AS "accountId", category_id AS "categoryId", service, amount, currency,
                   next_billing_date AS "nextBillingDate"`,
      [req.user.sub, accountId, categoryId, service, amount, currency, nextBillingDate]
    );
    res.status(201).json({ subscription: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.put("/subscriptions/:id", authMiddleware, async (req, res, next) => {
  try {
    const { accountId, categoryId, service, amount, currency, nextBillingDate } =
      await SubscriptionSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `UPDATE subscriptions SET account_id = $3, category_id = $4, service = $5, amount = $6, currency = $7,
              next_billing_date = $8
         WHERE id = $1 AND user_id = $2
         RETURNING id, account_id AS "accountId", category_id AS "categoryId", service, amount, currency,
                   next_billing_date AS "nextBillingDate"`,
      [req.params.id, req.user.sub, accountId, categoryId, service, amount, currency, nextBillingDate]
    );
    if (rows.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ subscription: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.delete("/subscriptions/:id", authMiddleware, async (req, res) => {
  const result = await pool.query(
    "DELETE FROM subscriptions WHERE id = $1 AND user_id = $2",
    [req.params.id, req.user.sub]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: "NOT_FOUND" });
  res.status(204).send();
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

app.post("/budgets", authMiddleware, async (req, res, next) => {
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
    return next(e);
  }
});

app.put("/budgets/:id", authMiddleware, async (req, res, next) => {
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
    return next(e);
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

app.post("/goals", authMiddleware, async (req, res, next) => {
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
    return next(e);
  }
});

app.put("/goals/:id", authMiddleware, async (req, res, next) => {
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
    return next(e);
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

app.post("/investments", authMiddleware, async (req, res, next) => {
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
    return next(e);
  }
});

app.put("/investments/:id", authMiddleware, async (req, res, next) => {
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
    return next(e);
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

// Loans
app.get("/loans", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, description, amount, currency, interest_rate AS "interestRate", start_date AS "startDate", end_date AS "endDate"
       FROM loans WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ loans: rows });
});

app.post("/loans", authMiddleware, async (req, res, next) => {
  try {
    const { description, amount, currency, interestRate, startDate, endDate } = await LoanSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO loans (user_id, description, amount, currency, interest_rate, start_date, end_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, description, amount, currency, interest_rate AS "interestRate", start_date AS "startDate", end_date AS "endDate"`,
      [req.user.sub, description, amount, currency, interestRate, startDate, endDate]
    );
    res.status(201).json({ loan: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

app.get("/loans/:id/payments", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.loan_id AS "loanId", p.amount, p.paid_at AS "paidAt"
       FROM loan_payments p
       JOIN loans l ON p.loan_id = l.id
       WHERE l.id = $1 AND l.user_id = $2
       ORDER BY p.paid_at DESC`,
    [req.params.id, req.user.sub]
  );
  res.json({ payments: rows });
});

app.post("/loans/:id/payments", authMiddleware, async (req, res, next) => {
  try {
    const { amount, paidAt } = await LoanPaymentSchema.parseAsync(req.body);
    const { rows } = await pool.query(
      `INSERT INTO loan_payments (loan_id, amount, paid_at)
         SELECT id, $2, $3 FROM loans WHERE id = $1 AND user_id = $4
         RETURNING id, loan_id AS "loanId", amount, paid_at AS "paidAt"`,
      [req.params.id, amount, paidAt, req.user.sub]
    );
    if (rows.length === 0) return res.status(404).json({ error: "NOT_FOUND" });
    res.status(201).json({ payment: rows[0] });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: "VALIDATION_ERROR", details: e.errors });
    }
    return next(e);
  }
});

// Reports
app.get("/reports", authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, data FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.sub]
  );
  res.json({ reports: rows });
});

app.post("/reports", authMiddleware, async (req, res, next) => {
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
    return next(e);
  }
});

// Pluggy routes
app.use("/pluggy", createPluggyRoutes({ pool, authMiddleware, ENC_KEY, createNotification }));

app.use((err, _req, res, _next) => {
  logger.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR" });
});

const PORT = process.env.PORT || 4000;
let scheduler;

if (process.env.NODE_ENV !== "test") {
  knexClient.migrate.latest().then(() => {
    app.listen(PORT, () => logger.info(`API online na porta ${PORT}`));
    scheduler = initScheduler({ pool, ENC_KEY, checkBudget, logger });
  });
}

async function shutdown() {
  try {
    scheduler?.stop();
    await pool.end();
    await knexClient.destroy();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export { app, pool };
export default app;
