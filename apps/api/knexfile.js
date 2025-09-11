import dotenv from 'dotenv';
dotenv.config();

export default {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};
