import express from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import logger from '../logger.js';

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

function signToken(user) {
  const payload = { sub: user.id, name: user.name, email: user.email };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export default function createAuthRoutes({ pool, authMiddleware, ENC_KEY }) {
  const router = express.Router();

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    handler: (_req, res) => res.status(429).json({ error: 'Too Many Requests' }),
  });

  router.post('/register', authLimiter, async (req, res) => {
    try {
      const { name, email, password } = await RegisterSchema.parseAsync(req.body);
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email, created_at',
        [name, email.toLowerCase(), hash]
      );
      const user = rows[0];
      const token = signToken(user);
      const csrfToken = crypto.randomBytes(20).toString('hex');
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.cookie('csrfToken', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.status(201).json({ user });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      if (String(e).includes('duplicate key')) {
        return res.status(409).json({ error: 'EMAIL_ALREADY_EXISTS' });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.post('/login', authLimiter, async (req, res) => {
    try {
      const { email, password, totp } = await LoginSchema.parseAsync(req.body);
      const { rows } = await pool.query(
        'SELECT id, name, email, password_hash, twofa_enabled, pgp_sym_decrypt(twofa_secret, $2) AS twofa_secret FROM users WHERE email = $1',
        [email.toLowerCase(), ENC_KEY]
      );
      const user = rows[0];
      if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      if (user.twofa_enabled) {
        if (!totp) return res.status(401).json({ error: 'TOTP_REQUIRED' });
        const validTotp = speakeasy.totp.verify({ secret: user.twofa_secret, encoding: 'base32', token: totp });
        if (!validTotp) return res.status(401).json({ error: 'INVALID_TOTP' });
      }
      const token = signToken(user);
      const csrfToken = crypto.randomBytes(20).toString('hex');
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.cookie('csrfToken', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      res.json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.clearCookie('csrfToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.sendStatus(204);
  });

  router.post('/2fa/setup', authMiddleware, async (req, res) => {
    try {
      const secret = speakeasy.generateSecret({ name: 'Finance App' });
      await pool.query(
        "UPDATE users SET twofa_secret = pgp_sym_encrypt($1, $3, 'cipher-algo=aes256'), twofa_enabled = FALSE WHERE id = $2",
        [secret.base32, req.user.sub, ENC_KEY]
      );
      const qrcode = await QRCode.toDataURL(secret.otpauth_url);
      res.json({ qrcode });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.post('/2fa/verify', authMiddleware, async (req, res) => {
    try {
      const { token } = await TotpSchema.parseAsync(req.body);
      const { rows } = await pool.query(
        'SELECT pgp_sym_decrypt(twofa_secret, $2) AS twofa_secret FROM users WHERE id = $1',
        [req.user.sub, ENC_KEY]
      );
      const secret = rows[0]?.twofa_secret;
      const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token });
      if (!ok) return res.status(400).json({ error: 'INVALID_TOTP' });
      await pool.query('UPDATE users SET twofa_enabled = TRUE WHERE id = $1', [req.user.sub]);
      res.json({});
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.delete('/2fa', authMiddleware, async (req, res) => {
    try {
      const { token } = await TotpSchema.parseAsync(req.body);
      const { rows } = await pool.query(
        'SELECT pgp_sym_decrypt(twofa_secret, $2) AS twofa_secret FROM users WHERE id = $1',
        [req.user.sub, ENC_KEY]
      );
      const secret = rows[0]?.twofa_secret;
      const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token });
      if (!ok) return res.status(400).json({ error: 'INVALID_TOTP' });
      await pool.query('UPDATE users SET twofa_secret = NULL, twofa_enabled = FALSE WHERE id = $1', [req.user.sub]);
      res.json({});
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
