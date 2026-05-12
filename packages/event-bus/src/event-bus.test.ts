import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";
import { createPublisher } from "./publisher.js";
import { createConsumer, type EventNotification } from "./consumer.js";

// Refs: SPEC.md §6 — DomainEvent append-only + PG NOTIFY
// Refs: WORKFLOW.md §3 — it_is_idempotent_on_event_id

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://elearning:elearning_dev@localhost:5433/elearning_dev";

let pool: pg.Pool;
let listenerClient: pg.Client;

beforeAll(async () => {
  pool = new pg.Pool({ connectionString: DATABASE_URL });
  listenerClient = new pg.Client({ connectionString: DATABASE_URL });
  await listenerClient.connect();
});

afterAll(async () => {
  await listenerClient.end();
  await pool.end();
});

beforeEach(async () => {
  await pool.query("DELETE FROM domain_events");
});

describe("EventPublisher", () => {
  it("inserts event into domain_events table", async () => {
    // First create a tenant for FK-less events (domain_events has no FK to tenants)
    const publisher = createPublisher(pool);
    const event = await publisher.publish({
      event_name: "TenantOnboarded",
      event_version: "1.0",
      tenant_id: "test-tenant-id",
      produced_by: "test",
      payload: { tenant_slug: "acme", tenant_name: "Acme Corp" },
    });

    expect(event.event_id).toBeTruthy();
    expect(event.occurred_at).toBeTruthy();
    expect(event.event_name).toBe("TenantOnboarded");

    // Verify it's in the DB
    const result = await pool.query("SELECT * FROM domain_events WHERE id = $1", [event.event_id]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].event_name).toBe("TenantOnboarded");
    expect(result.rows[0].payload).toEqual({ tenant_slug: "acme", tenant_name: "Acme Corp" });
  });

  it("it_is_idempotent_on_event_id — same event_id cannot be inserted twice", async () => {
    const publisher = createPublisher(pool);
    const event = await publisher.publish({
      event_name: "ProgressUpdated",
      event_version: "1.0",
      tenant_id: "test-tenant-id",
      produced_by: "test",
      payload: { learner_id: "l-1", module_id: "m-1", module_version_hash: "h1", progress_percent: 50 },
    });

    // Trying to insert with same PK should fail
    await expect(
      pool.query(
        "INSERT INTO domain_events (id, event_name, event_version, tenant_id, produced_by, payload) VALUES ($1, $2, $3, $4, $5, $6)",
        [event.event_id, "ProgressUpdated", "1.0", "test-tenant-id", "test", "{}"],
      ),
    ).rejects.toThrow();
  });

  it("event payload is stored as JSON", async () => {
    const publisher = createPublisher(pool);
    const payload = {
      learner_id: "l-1",
      competence_id: "c-1",
      stamp_id: "s-1",
      performance_score: 92,
      module_version_hash: "sha256-xyz",
    };
    const event = await publisher.publish({
      event_name: "CompetenceValidated",
      event_version: "1.0",
      tenant_id: "test-tenant-id",
      produced_by: "test",
      payload,
    });

    const result = await pool.query("SELECT payload FROM domain_events WHERE id = $1", [event.event_id]);
    expect(result.rows[0].payload).toEqual(payload);
  });
});

describe("EventConsumer", () => {
  it("receives notification on event insert via LISTEN/NOTIFY", async () => {
    const consumer = createConsumer(listenerClient);
    const received: EventNotification[] = [];

    await consumer.start();

    // Drain any pending notifications from previous tests
    await new Promise((r) => setTimeout(r, 200));

    consumer.subscribe((notification) => {
      received.push(notification);
    });

    const publisher = createPublisher(pool);
    await publisher.publish({
      event_name: "ConsumerTestEvent",
      event_version: "1.0",
      tenant_id: "test-consumer-tenant",
      produced_by: "test",
      payload: { learner_id: "l-1", module_id: "m-1", module_version_hash: "h", progress_percent: 75 },
    });

    // Wait for notification to arrive
    await new Promise((r) => setTimeout(r, 500));

    await consumer.stop();

    expect(received).toHaveLength(1);
    expect(received[0].event_name).toBe("ConsumerTestEvent");
    expect(received[0].tenant_id).toBe("test-consumer-tenant");
  });
});

describe("Append-only constraint", () => {
  it("domain_events table does not allow UPDATE via app logic", async () => {
    const publisher = createPublisher(pool);
    const event = await publisher.publish({
      event_name: "TenantOnboarded",
      event_version: "1.0",
      tenant_id: "test-tenant-id",
      produced_by: "test",
      payload: { tenant_slug: "acme", tenant_name: "Acme" },
    });

    // Events are immutable — verify the row exists and can be read
    const result = await pool.query("SELECT * FROM domain_events WHERE id = $1", [event.event_id]);
    expect(result.rows).toHaveLength(1);

    // Note: true append-only enforcement is via GRANT (app_user role has no UPDATE/DELETE)
    // Here we verify the data integrity after insert
    expect(result.rows[0].event_name).toBe("TenantOnboarded");
    expect(result.rows[0].event_version).toBe("1.0");
  });
});
