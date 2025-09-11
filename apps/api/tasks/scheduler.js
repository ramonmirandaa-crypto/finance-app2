import cron from 'node-cron';

export function initScheduler({ pool, ENC_KEY, checkBudget, logger }) {
  async function processRecurrings() {
    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, account_id, category_id, type, amount, currency, interval_days, next_occurrence,
                pgp_sym_decrypt(description, $1) AS description
         FROM recurrings
         WHERE next_occurrence <= NOW()`,
        [ENC_KEY]
      );
      for (const r of rows) {
        await pool.query(
          `INSERT INTO transactions (user_id, account_id, category_id, type, amount, currency, date, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7, pgp_sym_encrypt($8,$9,'cipher-algo=aes256'))`,
          [r.user_id, r.account_id, r.category_id, r.type, r.amount, r.currency, r.next_occurrence, r.description, ENC_KEY]
        );
        await checkBudget(r.user_id, r.category_id);
        await pool.query(
          `UPDATE recurrings SET next_occurrence = next_occurrence + interval_days * INTERVAL '1 day'
           WHERE id = $1`,
          [r.id]
        );
      }
    } catch (e) {
      logger.error(e);
    }
  }

  async function processScheduled() {
    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, account_id, category_id, type, amount, currency, date,
                pgp_sym_decrypt(description, $1) AS description
         FROM scheduled_transactions
         WHERE execute_at <= NOW()`,
        [ENC_KEY]
      );
      for (const t of rows) {
        await pool.query(
          `INSERT INTO transactions (user_id, account_id, category_id, type, amount, currency, date, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7, pgp_sym_encrypt($8,$9,'cipher-algo=aes256'))`,
          [t.user_id, t.account_id, t.category_id, t.type, t.amount, t.currency, t.date, t.description, ENC_KEY]
        );
        await checkBudget(t.user_id, t.category_id);
        await pool.query(`DELETE FROM scheduled_transactions WHERE id = $1`, [t.id]);
      }
    } catch (e) {
      logger.error(e);
    }
  }

  setInterval(processRecurrings, 60 * 1000);
  cron.schedule('* * * * *', processScheduled);
}
