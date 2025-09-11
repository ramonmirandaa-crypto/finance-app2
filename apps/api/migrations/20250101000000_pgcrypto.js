export async function up(knex) {
  await knex.schema.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
}

export async function down(knex) {
  await knex.schema.raw('DROP EXTENSION IF EXISTS "pgcrypto";');
}
