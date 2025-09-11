import express from 'express';
import { z } from 'zod';
import logger from '../logger.js';

const AccountSchema = z.object({
  agency: z.string(),
  number: z.string(),
  manager: z.string().optional(),
  phone: z.string().optional(),
});

export default function createAccountsRoutes({ pool, authMiddleware, ENC_KEY }) {
  const router = express.Router();

  router.get('/', authMiddleware, async (req, res) => {
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

  router.post('/', authMiddleware, async (req, res) => {
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
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.get('/:id', authMiddleware, async (req, res) => {
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
    if (!account) return res.status(404).json({ error: 'NOT_FOUND' });
    res.json({ account });
  });

  router.put('/:id', authMiddleware, async (req, res) => {
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
      if (result.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });
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
        return res.status(400).json({ error: 'VALIDATION_ERROR', details: e.errors });
      }
      logger.error(e);
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  });

  router.delete('/:id', authMiddleware, async (req, res) => {
    const result = await pool.query(
      'DELETE FROM accounts WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.sub]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND' });
    res.status(204).send();
  });

  return router;
}
