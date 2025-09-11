export async function up(knex) {
  await knex.schema.raw(`
    ALTER TABLE users
    ADD COLUMN twofa_secret BYTEA,
    ADD COLUMN twofa_enabled BOOLEAN DEFAULT FALSE;
  `);
}

export async function down(knex) {
  await knex.schema.raw(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS twofa_secret,
    DROP COLUMN IF EXISTS twofa_enabled;
  `);
}
