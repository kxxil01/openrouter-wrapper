import type { Sql } from 'postgres';

export async function up(sql: Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      customer_id VARCHAR(255) NOT NULL,
      payload JSONB NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'queued',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_webhook_events_customer_id ON webhook_events(customer_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC)`;
}

export async function down(sql: Sql): Promise<void> {
  await sql`DROP TABLE IF EXISTS webhook_events`;
}
