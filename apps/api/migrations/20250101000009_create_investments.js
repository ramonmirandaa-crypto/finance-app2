export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS investments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      currency TEXT NOT NULL,
      pluggy_transaction_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('investments');
}
