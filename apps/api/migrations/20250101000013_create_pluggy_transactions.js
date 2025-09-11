export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS pluggy_transactions (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT REFERENCES pluggy_items(id) ON DELETE CASCADE,
      account_id TEXT REFERENCES pluggy_accounts(id) ON DELETE CASCADE,
      description TEXT,
      amount NUMERIC,
      currency TEXT,
      date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pluggy_transactions');
}
