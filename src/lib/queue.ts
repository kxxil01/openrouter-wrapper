import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { isRedisAvailable } from './redis';
import { sql } from './db';
import { config } from './config';
import { v7 as uuidv7 } from 'uuid';

const QUEUE_NAME = 'stripe-webhooks';
const DEAD_LETTER_QUEUE = 'stripe-webhooks-dlq';

let webhookQueue: Queue | null = null;
let deadLetterQueue: Queue | null = null;
let webhookWorker: Worker | null = null;

function createBullMQConnection(): Redis {
  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,
    maxRetriesPerRequest: null,
  });
}

export function getWebhookQueue(): Queue | null {
  if (!isRedisAvailable()) return null;

  if (!webhookQueue) {
    webhookQueue = new Queue(QUEUE_NAME, {
      connection: createBullMQConnection(),
      defaultJobOptions: {
        attempts: 10,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: false,
      },
    });
  }
  return webhookQueue;
}

export interface StripeWebhookPayload {
  type: string;
  customerId: string;
  subscriptionId?: string;
  status?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  priceId?: string;
  eventId?: string;
  idempotencyKey?: string;
  receivedAt?: string;
}

export async function queueStripeWebhook(
  payload: StripeWebhookPayload,
  stripeEventId?: string
): Promise<boolean> {
  const queue = getWebhookQueue();
  if (!queue) {
    return false;
  }

  const idempotencyKey = stripeEventId || `${payload.type}-${payload.customerId}-${Date.now()}`;
  const enrichedPayload: StripeWebhookPayload = {
    ...payload,
    eventId: stripeEventId,
    idempotencyKey,
    receivedAt: new Date().toISOString(),
  };

  await queue.add('stripe-webhook', enrichedPayload, {
    jobId: idempotencyKey,
  });

  await logWebhookEvent(enrichedPayload, 'queued');
  return true;
}

async function logWebhookEvent(
  payload: StripeWebhookPayload,
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter'
): Promise<void> {
  try {
    await sql`
      INSERT INTO webhook_events (id, event_type, customer_id, payload, status, created_at)
      VALUES (
        ${uuidv7()},
        ${payload.type},
        ${payload.customerId},
        ${JSON.stringify(payload)},
        ${status},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET status = ${status}, updated_at = NOW()
    `;
  } catch (err) {
    console.error('[Queue] Failed to log webhook event:', err);
  }
}

async function moveToDeadLetterQueue(job: Job<StripeWebhookPayload>): Promise<void> {
  if (!isRedisAvailable()) return;

  if (!deadLetterQueue) {
    deadLetterQueue = new Queue(DEAD_LETTER_QUEUE, {
      connection: createBullMQConnection(),
    });
  }

  await deadLetterQueue.add('failed-webhook', {
    ...job.data,
    originalJobId: job.id,
    failedAt: new Date().toISOString(),
    attemptsMade: job.attemptsMade,
  });

  await logWebhookEvent(job.data, 'dead_letter');
  console.error(
    `[Queue] CRITICAL: Billing webhook moved to DLQ - Type: ${job.data.type}, Customer: ${job.data.customerId}`
  );
}

async function processStripeWebhook(job: Job<StripeWebhookPayload>): Promise<void> {
  const { type, customerId, subscriptionId, status, currentPeriodEnd } = job.data;

  await logWebhookEvent(job.data, 'processing');
  console.log(
    `[Queue] Processing ${type} for customer ${customerId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts})`
  );

  switch (type) {
    case 'checkout.session.completed':
      if (subscriptionId && status) {
        await sql`
          UPDATE users 
          SET 
            stripe_subscription_id = ${subscriptionId},
            subscription_status = ${status},
            subscription_expires_at = ${currentPeriodEnd ? new Date(currentPeriodEnd) : null},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
        `;
      }
      break;

    case 'customer.subscription.updated':
      await sql`
        UPDATE users 
        SET 
          subscription_status = ${status || 'active'},
          subscription_expires_at = ${currentPeriodEnd ? new Date(currentPeriodEnd) : null},
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
      `;
      break;

    case 'customer.subscription.deleted':
      await sql`
        UPDATE users 
        SET 
          subscription_status = 'cancelled',
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
      `;
      break;

    case 'invoice.payment_failed':
      await sql`
        UPDATE users 
        SET 
          subscription_status = 'past_due',
          updated_at = NOW()
        WHERE stripe_customer_id = ${customerId}
      `;
      break;

    case 'invoice.paid':
      if (currentPeriodEnd) {
        await sql`
          UPDATE users 
          SET 
            subscription_status = 'active',
            subscription_expires_at = ${new Date(currentPeriodEnd)},
            updated_at = NOW()
          WHERE stripe_customer_id = ${customerId}
        `;
      }
      break;

    default:
      console.log(`[Queue] Unhandled webhook type: ${type}`);
  }

  await logWebhookEvent(job.data, 'completed');
  console.log(`[Queue] Completed ${type} for customer ${customerId}`);
}

export function initWebhookWorker(): void {
  if (!isRedisAvailable()) {
    console.log('[Queue] Redis not available, webhook worker not started');
    return;
  }

  if (webhookWorker) return;

  webhookWorker = new Worker<StripeWebhookPayload>(QUEUE_NAME, processStripeWebhook, {
    connection: createBullMQConnection(),
    concurrency: 5,
  });

  webhookWorker.on('completed', (job) => {
    console.log(`[Queue] Job ${job.id} completed successfully`);
  });

  webhookWorker.on('failed', async (job, err) => {
    if (!job) return;

    const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 10);
    console.error(
      `[Queue] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`,
      err.message
    );

    if (isLastAttempt) {
      await moveToDeadLetterQueue(job);
    } else {
      await logWebhookEvent(job.data, 'failed');
    }
  });

  console.log('[Queue] Webhook worker started');
}

export async function closeQueue(): Promise<void> {
  if (webhookWorker) {
    await webhookWorker.close();
    webhookWorker = null;
  }
  if (webhookQueue) {
    await webhookQueue.close();
    webhookQueue = null;
  }
}
