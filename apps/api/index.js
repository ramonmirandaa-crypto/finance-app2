import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pkg from "pg";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(express.json());

// CORS restrito à origem do frontend (configurável via FRONTEND_ORIGIN)
app.use((req, res, next) => {
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Conexão Postgres (serviço "db" do docker-compose)
let pool;
if (process.env.NODE_ENV !== 'test') {
  pool = new Pool({
    host: process.env.DB_HOST || "db",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || "finai",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });
}

export function setPool(newPool) {
  pool = newPool;
}

// Cria tabela users se não existir
async function ensureSchema(p = pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
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

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== 'test') {
  ensureSchema().then(() => {
    app.listen(PORT, () => console.log(`API online na porta ${PORT}`));
  });
}

export { app, ensureSchema };
