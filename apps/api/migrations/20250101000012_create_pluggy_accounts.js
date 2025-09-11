export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS pluggy_accounts (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT REFERENCES pluggy_items(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT,
      number BYTEA,
      agency BYTEA,
      balance NUMERIC,
      currency TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pluggy_accounts');
}
