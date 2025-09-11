export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      agency TEXT NOT NULL,
      account_number BYTEA NOT NULL,
      manager BYTEA,
      phone BYTEA,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('accounts');
}
