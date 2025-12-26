import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  await sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_customer_id'
      ) THEN
        ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'stripe_subscription_id'
      ) THEN
        ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'openrouter_api_key'
      ) THEN
        ALTER TABLE users ADD COLUMN openrouter_api_key VARCHAR(500);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'total_tokens_used'
      ) THEN
        ALTER TABLE users ADD COLUMN total_tokens_used BIGINT NOT NULL DEFAULT 0;
      END IF;
    END $$
  `;
  console.log('✓ users stripe/billing columns ready');

  await sql`CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id)`;
  console.log('✓ users stripe_customer_id index ready');
}

export async function down(sql: Sql) {
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id`;
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id`;
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS openrouter_api_key`;
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS total_tokens_used`;
}
