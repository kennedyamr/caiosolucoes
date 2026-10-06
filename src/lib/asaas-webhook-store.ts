import { Pool } from "pg";
import type { PlanSlug } from "@/lib/plans";

export type CheckoutEventType =
  | "CHECKOUT_CREATED"
  | "CHECKOUT_PAID"
  | "CHECKOUT_CANCELED"
  | "CHECKOUT_EXPIRED";

export type CheckoutStatus = "ACTIVE" | "PAID" | "CANCELED" | "EXPIRED";

export type CheckoutWebhookEvent = {
  id: string;
  event: CheckoutEventType;
  checkoutId: string;
  externalReference?: string;
  payload: unknown;
};

export type PixOrderStatus =
  | "CREATING"
  | "PENDING"
  | "PAID"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED"
  | "FAILED";

export type PixOrder = {
  orderId: string;
  planSlug: PlanSlug;
  amountCents: number;
  status: PixOrderStatus;
  paymentId: string | null;
  pixPayload: string | null;
  qrCodeBase64: string | null;
  expiresAt: string | null;
};

export type PixPaymentEvent = {
  eventId: string;
  eventType: string;
  paymentId: string;
  orderId: string;
  amountCents: number;
  payload: unknown;
};

export class WebhookStoreConfigurationError extends Error {}

let pool: Pool | undefined;

function getPool() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new WebhookStoreConfigurationError(
      "Webhook persistence is unavailable: configure DATABASE_URL with a PostgreSQL connection string."
    );
  }

  pool ??= new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  return pool;
}

async function ensurePixTables(client: import("pg").PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS asaas_pix_orders (
      order_id UUID PRIMARY KEY,
      plan_slug TEXT NOT NULL CHECK (plan_slug IN ('mensal', 'anual')),
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      status TEXT NOT NULL CHECK (
        status IN ('CREATING', 'PENDING', 'PAID', 'CANCELED', 'EXPIRED', 'REFUNDED', 'FAILED')
      ),
      payment_id TEXT UNIQUE,
      pix_payload TEXT,
      qr_code_base64 TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS asaas_pix_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payment_id TEXT NOT NULL,
      order_id UUID NOT NULL REFERENCES asaas_pix_orders(order_id),
      payload JSONB NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function createPixOrder(
  orderId: string,
  planSlug: PlanSlug,
  amountCents: number
) {
  const client = await getPool().connect();
  try {
    await ensurePixTables(client);
    await client.query(
      `INSERT INTO asaas_pix_orders (order_id, plan_slug, amount_cents, status)
       VALUES ($1, $2, $3, 'CREATING')`,
      [orderId, planSlug, amountCents]
    );
  } finally {
    client.release();
  }
}

export async function attachPixPayment(orderId: string, paymentId: string) {
  const client = await getPool().connect();
  try {
    await ensurePixTables(client);
    const result = await client.query(
      `UPDATE asaas_pix_orders
       SET payment_id = COALESCE(payment_id, $2),
           status = CASE WHEN status = 'CREATING' THEN 'PENDING' ELSE status END,
           updated_at = NOW()
       WHERE order_id = $1 AND (payment_id IS NULL OR payment_id = $2)`,
      [orderId, paymentId]
    );
    if (result.rowCount !== 1) {
      throw new Error("Pix payment does not match its pending order.");
    }
  } finally {
    client.release();
  }
}

export async function savePixQrCode(
  orderId: string,
  paymentId: string,
  pixPayload: string,
  qrCodeBase64: string,
  expiresAt: string | null
) {
  const client = await getPool().connect();
  try {
    await ensurePixTables(client);
    const result = await client.query(
      `UPDATE asaas_pix_orders
       SET pix_payload = $3, qr_code_base64 = $4, expires_at = $5, updated_at = NOW()
       WHERE order_id = $1 AND payment_id = $2`,
      [orderId, paymentId, pixPayload, qrCodeBase64, expiresAt]
    );
    if (result.rowCount !== 1) {
      throw new Error("Pix QR code does not match its pending order.");
    }
  } finally {
    client.release();
  }
}

export async function markPixOrderFailed(orderId: string) {
  const client = await getPool().connect();
  try {
    await ensurePixTables(client);
    await client.query(
      `UPDATE asaas_pix_orders
       SET status = 'FAILED', updated_at = NOW()
       WHERE order_id = $1 AND payment_id IS NULL AND status = 'CREATING'`,
      [orderId]
    );
  } finally {
    client.release();
  }
}

export async function getPixOrder(orderId: string): Promise<PixOrder | null> {
  const client = await getPool().connect();
  try {
    await ensurePixTables(client);
    const result = await client.query<{
      order_id: string;
      plan_slug: PlanSlug;
      amount_cents: number;
      status: PixOrderStatus;
      payment_id: string | null;
      pix_payload: string | null;
      qr_code_base64: string | null;
      expires_at: Date | null;
    }>(
      `SELECT order_id, plan_slug, amount_cents, status, payment_id,
              pix_payload, qr_code_base64, expires_at
       FROM asaas_pix_orders
       WHERE order_id = $1`,
      [orderId]
    );
    const order = result.rows[0];
    if (!order) return null;

    return {
      orderId: order.order_id,
      planSlug: order.plan_slug,
      amountCents: order.amount_cents,
      status: order.status,
      paymentId: order.payment_id,
      pixPayload: order.pix_payload,
      qrCodeBase64: order.qr_code_base64,
      expiresAt: order.expires_at?.toISOString() ?? null,
    };
  } finally {
    client.release();
  }
}

export async function updatePixOrderStatus(
  orderId: string,
  status: Exclude<PixOrderStatus, "CREATING" | "FAILED">
) {
  const client = await getPool().connect();
  try {
    await ensurePixTables(client);
    const result = await client.query(
      `UPDATE asaas_pix_orders
       SET status = CASE
             WHEN status = 'REFUNDED' THEN 'REFUNDED'
             WHEN $2 = 'REFUNDED' THEN 'REFUNDED'
             WHEN $2 = 'PAID' THEN 'PAID'
             WHEN status = 'PAID' THEN 'PAID'
             ELSE $2
           END,
           updated_at = NOW()
       WHERE order_id = $1`,
      [orderId, status]
    );
    return result.rowCount === 1;
  } finally {
    client.release();
  }
}

export async function persistPixPaymentEvent(event: PixPaymentEvent) {
  const client = await getPool().connect();
  let transactionStarted = false;
  try {
    await ensurePixTables(client);
    await client.query("BEGIN");
    transactionStarted = true;

    const orderResult = await client.query<{
      payment_id: string | null;
      amount_cents: number;
    }>(
      `SELECT payment_id, amount_cents
       FROM asaas_pix_orders
       WHERE order_id = $1
       FOR UPDATE`,
      [event.orderId]
    );
    const order = orderResult.rows[0];
    if (
      !order ||
      order.amount_cents !== event.amountCents ||
      (order.payment_id !== null && order.payment_id !== event.paymentId)
    ) {
      await client.query("ROLLBACK");
      transactionStarted = false;
      return "ignored" as const;
    }

    const inserted = await client.query(
      `INSERT INTO asaas_pix_events (event_id, event_type, payment_id, order_id, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [
        event.eventId,
        event.eventType,
        event.paymentId,
        event.orderId,
        JSON.stringify(event.payload),
      ]
    );

    if (inserted.rowCount === 0) {
      await client.query("COMMIT");
      transactionStarted = false;
      return "duplicate" as const;
    }

    const nextStatus: Record<string, Exclude<PixOrderStatus, "CREATING" | "FAILED">> = {
      PAYMENT_CONFIRMED: "PAID",
      PAYMENT_RECEIVED: "PAID",
      PAYMENT_OVERDUE: "EXPIRED",
      PAYMENT_DELETED: "CANCELED",
      PAYMENT_REFUNDED: "REFUNDED",
      PAYMENT_PARTIALLY_REFUNDED: "REFUNDED",
      PAYMENT_RECEIVED_IN_CASH_UNDONE: "CANCELED",
    };

    await client.query(
      `UPDATE asaas_pix_orders
       SET payment_id = COALESCE(payment_id, $2),
           status = CASE
             WHEN status = 'REFUNDED' OR $3 = 'REFUNDED' THEN 'REFUNDED'
             WHEN $3 = 'PAID' THEN 'PAID'
             WHEN status = 'PAID' THEN 'PAID'
             ELSE $3
           END,
           updated_at = NOW()
       WHERE order_id = $1`,
      [event.orderId, event.paymentId, nextStatus[event.eventType]]
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return "processed" as const;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Unable to roll back the Asaas Pix webhook transaction.", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}

function getPlanSlug(reference: string | undefined): PlanSlug | null {
  if (reference === "caio-solucoes:mensal") return "mensal";
  if (reference === "caio-solucoes:anual") return "anual";
  return null;
}

export async function persistCheckoutEvent(event: CheckoutWebhookEvent) {
  const client = await getPool().connect();
  let transactionStarted = false;

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS asaas_checkout_events (
        event_id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL CHECK (
          event_type IN (
            'CHECKOUT_CREATED',
            'CHECKOUT_PAID',
            'CHECKOUT_CANCELED',
            'CHECKOUT_EXPIRED'
          )
        ),
        checkout_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS asaas_checkout_status (
        checkout_id TEXT PRIMARY KEY,
        plan_slug TEXT CHECK (plan_slug IN ('mensal', 'anual')),
        status TEXT NOT NULL CHECK (
          status IN ('ACTIVE', 'PAID', 'CANCELED', 'EXPIRED')
        ),
        last_event_id TEXT NOT NULL REFERENCES asaas_checkout_events(event_id),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query("BEGIN");
    transactionStarted = true;
    const insertedEvent = await client.query<{ event_id: string }>(
      `INSERT INTO asaas_checkout_events (event_id, event_type, checkout_id, payload)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [event.id, event.event, event.checkoutId, JSON.stringify(event.payload)]
    );

    if (insertedEvent.rowCount === 0) {
      await client.query("COMMIT");
      transactionStarted = false;
      return "duplicate" as const;
    }

    const statuses: Record<CheckoutEventType, CheckoutStatus> = {
      CHECKOUT_CREATED: "ACTIVE",
      CHECKOUT_PAID: "PAID",
      CHECKOUT_CANCELED: "CANCELED",
      CHECKOUT_EXPIRED: "EXPIRED",
    };

    await client.query(
      `INSERT INTO asaas_checkout_status
         (checkout_id, plan_slug, status, last_event_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (checkout_id) DO UPDATE SET
         plan_slug = COALESCE(EXCLUDED.plan_slug, asaas_checkout_status.plan_slug),
         status = CASE
           WHEN EXCLUDED.status = 'PAID' THEN 'PAID'
           WHEN asaas_checkout_status.status IN ('PAID', 'CANCELED', 'EXPIRED')
             THEN asaas_checkout_status.status
           ELSE EXCLUDED.status
         END,
         last_event_id = CASE
           WHEN EXCLUDED.status = 'PAID'
             OR asaas_checkout_status.status NOT IN ('PAID', 'CANCELED', 'EXPIRED')
             THEN EXCLUDED.last_event_id
           ELSE asaas_checkout_status.last_event_id
         END,
         updated_at = NOW()`,
      [
        event.checkoutId,
        getPlanSlug(event.externalReference),
        statuses[event.event],
        event.id,
      ]
    );

    await client.query("COMMIT");
    transactionStarted = false;
    return "processed" as const;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Unable to roll back the Asaas webhook transaction.", rollbackError);
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
