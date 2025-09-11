export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      card_number BYTEA NOT NULL,
      expiration TEXT NOT NULL,
      card_limit NUMERIC NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await knex.schema.raw('ALTER TABLE cards DROP COLUMN IF EXISTS cvc;');
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('cards');
}
