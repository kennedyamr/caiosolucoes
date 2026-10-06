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
