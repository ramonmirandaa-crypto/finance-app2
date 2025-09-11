export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS scheduled_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL,
      date TIMESTAMPTZ NOT NULL,
      execute_at TIMESTAMPTZ NOT NULL,
      description BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('scheduled_transactions');
}
