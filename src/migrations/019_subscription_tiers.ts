import { sql } from '../lib/db';

export async function up() {
  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free'
  `;
  console.log('✓ users.subscription_tier column ready');

  await sql`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS subscription_scope VARCHAR(20) DEFAULT 'individual'
  `;
  console.log('✓ users.subscription_scope column ready');

  await sql`
    UPDATE users 
    SET subscription_tier = 'pro' 
    WHERE subscription_status = 'active'
  `;
  console.log('✓ migrated active subscriptions to pro tier');

  await sql`
    UPDATE users 
    SET subscription_tier = 'free' 
    WHERE subscription_status IN ('free', 'cancelled', 'expired')
  `;
  console.log('✓ migrated free/cancelled/expired to free tier');
}

export async function down() {
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS subscription_tier`;
  await sql`ALTER TABLE users DROP COLUMN IF EXISTS subscription_scope`;
}
