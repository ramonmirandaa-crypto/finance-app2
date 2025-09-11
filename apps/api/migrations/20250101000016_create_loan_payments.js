export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS loan_payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('loan_payments');
}
