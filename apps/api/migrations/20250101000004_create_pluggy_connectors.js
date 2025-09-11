export async function up(knex) {
  await knex.schema.raw(`
    CREATE TABLE IF NOT EXISTS pluggy_connectors (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('pluggy_connectors');
}
