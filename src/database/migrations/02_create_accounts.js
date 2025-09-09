exports.up = function(knex) {
  return knex.schema.createTable('accounts', table => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.decimal('balance', 15, 2).notNullable();
    table.enum('type', ['BANK_ACCOUNT', 'CREDIT_CARD']).notNullable();
    table.string('number');
    table.string('currency', 3).defaultTo('BRL');
    table.timestamps(true, true);
  });
};
exports.down = function(knex) {
  return knex.schema.dropTable('accounts');
};
