import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;
  console.log('✓ update_updated_at function ready');

  await sql`DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations`;
  await sql`
    CREATE TRIGGER update_conversations_updated_at
      BEFORE UPDATE ON conversations
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `;
  console.log('✓ conversations updated_at trigger ready');

  await sql`DROP TRIGGER IF EXISTS update_users_updated_at ON users`;
  await sql`
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
  `;
  console.log('✓ users updated_at trigger ready');
}

export async function down(sql: Sql) {
  await sql`DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations`;
  await sql`DROP TRIGGER IF EXISTS update_users_updated_at ON users`;
  await sql`DROP FUNCTION IF EXISTS update_updated_at_column()`;
}
