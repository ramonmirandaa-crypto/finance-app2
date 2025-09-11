import dotenv from "dotenv";
dotenv.config();

export default {
  client: "pg",
  connection: {
    host: process.env.DB_HOST || "db",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    database: process.env.DB_NAME || "finance",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  },
  migrations: {
    directory: "./migrations",
  },
};
