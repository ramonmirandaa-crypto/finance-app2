import express from 'express';
import { z } from 'zod';
import Pluggy from 'pluggy-sdk';
import crypto from 'crypto';
import logger from '../logger.js';

const PLUGGY_WEBHOOK_SECRET = process.env.PLUGGY_WEBHOOK_SECRET;
if (!PLUGGY_WEBHOOK_SECRET) {
  throw new Error('PLUGGY_WEBHOOK_SECRET is not defined');
}

const pluggy = new Pluggy({
  clientId: process.env.PLUGGY_CLIENT_ID,
  clientSecret: process.env.PLUGGY_CLIENT_SECRET,
  baseUrl: process.env.PLUGGY_BASE_URL || 'https://api.pluggy.ai',
});

const PluggyItemSchema = z.object({
  itemId: z.string(),
});

export default function createPluggyRoutes({ pool, authMiddleware, ENC_KEY, createNotification }) {
  const router = express.Router();

  router.post('/link-token', authMiddleware, async (req, res) => {
    try {
      const { accessToken } = await pluggy.createConnectToken(undefined, {
        clientUserId: req.user.sub,
      });
      res.json({ linkToken: accessToken });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.post('/items', authMiddleware, async (req, res) => {
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
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.get('/items', authMiddleware, async (req, res) => {
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

  router.get('/accounts', authMiddleware, async (req, res) => {
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

  router.get('/transactions', authMiddleware, async (req, res) => {
    const { rows } = await pool.query(
      `SELECT id, item_id AS "itemId", account_id AS "accountId", description, amount, currency, date
       FROM pluggy_transactions
       WHERE user_id = $1
       ORDER BY date DESC`,
      [req.user.sub]
    );
    res.json({ transactions: rows });
  });

  router.post('/items/:id/sync', authMiddleware, async (req, res) => {
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
      await createNotification(req.user.sub, 'pluggy_sync', 'Sincronização Pluggy concluída');
      res.status(200).json({ status: item.status });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.post('/webhook', async (req, res) => {
    const signature = req.get('x-pluggy-signature');
    const expected = crypto
      .createHmac('sha256', PLUGGY_WEBHOOK_SECRET)
      .update(req.rawBody || '')
      .digest('base64');
    if (
      !signature ||
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
      return res.status(401).json({ error: 'INVALID_SIGNATURE' });
    }
    const { itemId } = req.body || {};
    if (!itemId) return res.status(400).json({ error: 'INVALID_BODY' });
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
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  return router;
}
