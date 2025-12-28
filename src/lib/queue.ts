import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { isRedisAvailable } from './redis';
import { sql } from './db';
import { config } from './config';

const QUEUE_NAME = 'webhooks';

let webhookQueue: Queue | null = null;
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
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
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
}

export async function queueStripeWebhook(payload: StripeWebhookPayload): Promise<boolean> {
  const queue = getWebhookQueue();
  if (!queue) {
    return false;
  }

  await queue.add('stripe-webhook', payload, {
    jobId: `stripe-${payload.type}-${payload.customerId}-${Date.now()}`,
  });
  return true;
}

async function processStripeWebhook(job: Job<StripeWebhookPayload>): Promise<void> {
  const { type, customerId, subscriptionId, status, currentPeriodEnd } = job.data;

  console.log(`[Queue] Processing ${type} for customer ${customerId}`);

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
    console.log(`[Queue] Job ${job.id} completed`);
  });

  webhookWorker.on('failed', (job, err) => {
    console.error(`[Queue] Job ${job?.id} failed:`, err.message);
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
