import { sql } from '../lib/db';

export async function up() {
  await sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
      model_id VARCHAR(255) NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd DECIMAL(10, 6) DEFAULT 0,
      used_custom_key BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `;
  console.log('✓ usage_logs table ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id)
  `;
  console.log('✓ usage_logs user_id index ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)
  `;
  console.log('✓ usage_logs created_at index ready');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_usage_logs_user_created ON usage_logs(user_id, created_at DESC)
  `;
  console.log('✓ usage_logs user+created composite index ready');
}

export async function down() {
  await sql`DROP TABLE IF EXISTS usage_logs`;
  console.log('✓ usage_logs table dropped');
}
