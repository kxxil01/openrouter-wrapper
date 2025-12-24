import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      google_id VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      picture VARCHAR(500),
      locale VARCHAR(10),
      hd VARCHAR(100),
      subscription_status VARCHAR(20) NOT NULL DEFAULT 'free',
      subscription_expires_at TIMESTAMPTZ,
      message_count INTEGER NOT NULL DEFAULT 0,
      message_count_reset_at DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ
    )
  `;
  console.log('✓ users table ready');

  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_status'
      ) THEN
        ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) NOT NULL DEFAULT 'free';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subscription_expires_at'
      ) THEN
        ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMPTZ;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'message_count'
      ) THEN
        ALTER TABLE users ADD COLUMN message_count INTEGER NOT NULL DEFAULT 0;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'message_count_reset_at'
      ) THEN
        ALTER TABLE users ADD COLUMN message_count_reset_at DATE NOT NULL DEFAULT CURRENT_DATE;
      END IF;
    END $$
  `;
  console.log('✓ users subscription columns ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`;
  console.log('✓ users google_id index ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  console.log('✓ users email index ready');
}

export async function down(sql: Sql) {
  await sql`DROP TABLE IF EXISTS users CASCADE`;
}
