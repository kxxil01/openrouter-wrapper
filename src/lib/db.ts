import postgres from 'postgres';
import { config } from './config';

export const sql = postgres(config.database.url, {
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

console.log('Database connection initialized');
