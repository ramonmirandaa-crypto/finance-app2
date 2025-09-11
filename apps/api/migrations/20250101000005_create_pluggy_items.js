export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS pluggy_items (
      id TEXT PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      connector_id INTEGER REFERENCES pluggy_connectors(id),
      status TEXT NOT NULL,
      error TEXT,
      last_sync TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pluggy_items');
}
