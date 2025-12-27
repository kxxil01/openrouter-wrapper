import type { Sql } from 'postgres';

export async function up(sql: Sql) {
  console.log('Creating performance indexes for high-traffic queries...\n');

  // ============================================
  // USERS TABLE - Subscription & Billing Queries
  // ============================================

  // Index for filtering by subscription status (active subscribers)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_subscription_status ON users(subscription_status)`;
  console.log('✓ users subscription_status index ready');

  // Index for daily message count reset queries
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_message_reset ON users(message_count_reset_at)`;
  console.log('✓ users message_count_reset_at index ready');

  // Partial index for active subscribers only (smaller, faster)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_subscribers ON users(subscription_expires_at) WHERE subscription_status = 'active'`;
  console.log('✓ users active_subscribers partial index ready');

  // Index for superadmin lookups
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_user_type ON users(user_type) WHERE user_type IS NOT NULL`;
  console.log('✓ users user_type partial index ready');

  // ============================================
  // SESSIONS TABLE - Auth Performance
  // ============================================

  // Composite index for valid session validation (most common auth query)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_valid ON sessions(token_hash, expires_at) WHERE expires_at > NOW()`;
  console.log('✓ sessions valid_sessions partial index ready');

  // Index for session cleanup (expired sessions)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expired ON sessions(expires_at) WHERE expires_at <= NOW()`;
  console.log('✓ sessions expired partial index ready');

  // ============================================
  // CONVERSATIONS TABLE - List & Lookup Queries
  // ============================================

  // Composite index for user's conversations with folder (sidebar query)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user_folder ON conversations(user_id, folder_id, updated_at DESC)`;
  console.log('✓ conversations user+folder+updated composite index ready');

  // Partial index for shared conversations (public links)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_shared ON conversations(share_id) WHERE is_shared = TRUE`;
  console.log('✓ conversations shared partial index ready');

  // Index for team conversations
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_team_updated ON conversations(team_id, updated_at DESC) WHERE team_id IS NOT NULL`;
  console.log('✓ conversations team+updated partial index ready');

  // ============================================
  // MESSAGES TABLE - Chat Performance
  // ============================================

  // Standalone conversation_id index for COUNT queries
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`;
  console.log('✓ messages conversation_id index ready');

  // Index for role filtering (system prompts, user messages)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_role ON messages(conversation_id, role)`;
  console.log('✓ messages conversation+role composite index ready');

  // ============================================
  // FOLDERS TABLE - User Organization
  // ============================================

  // Composite index for user's folders sorted
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_folders_user_sort ON folders(user_id, sort_order)`;
  console.log('✓ folders user+sort composite index ready');

  // ============================================
  // TEAM INVITES - Lookup Performance
  // ============================================

  // Index for email lookups (checking existing invites)
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invites_email ON team_invites(email)`;
  console.log('✓ team_invites email index ready');

  // Partial index for valid (non-expired) invites
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_invites_valid ON team_invites(token, expires_at) WHERE expires_at > NOW()`;
  console.log('✓ team_invites valid partial index ready');

  // ============================================
  // USAGE LOGS - Analytics Performance
  // ============================================

  // Index for model usage analytics
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_model ON usage_logs(model_id, created_at DESC)`;
  console.log('✓ usage_logs model+created composite index ready');

  // Partial index for custom key usage tracking
  await sql`CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_logs_custom_key ON usage_logs(user_id, created_at DESC) WHERE used_custom_key = TRUE`;
  console.log('✓ usage_logs custom_key partial index ready');

  // ============================================
  // DATABASE STATISTICS & MAINTENANCE
  // ============================================

  // Update table statistics for query planner
  await sql`ANALYZE users`;
  await sql`ANALYZE sessions`;
  await sql`ANALYZE conversations`;
  await sql`ANALYZE messages`;
  await sql`ANALYZE folders`;
  await sql`ANALYZE usage_logs`;
  console.log('✓ Table statistics updated');

  console.log('\n✓ All performance indexes created successfully');
}

export async function down(sql: Sql) {
  // Drop all indexes created in this migration
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_users_subscription_status`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_users_message_reset`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_users_active_subscribers`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_users_user_type`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_sessions_valid`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_sessions_expired`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_user_folder`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_shared`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_conversations_team_updated`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_messages_conversation_id`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_messages_role`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_folders_user_sort`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_team_invites_email`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_team_invites_valid`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_usage_logs_model`;
  await sql`DROP INDEX CONCURRENTLY IF EXISTS idx_usage_logs_custom_key`;

  console.log('✓ Performance indexes dropped');
}
