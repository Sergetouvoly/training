import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { DomainEvent } from "@elearning/domain";

/**
 * Publishes domain events to the PG append-only `domain_events` table.
 * The DB trigger handles NOTIFY automatically.
 * Refs: SPEC.md §6, WORKFLOW.md §6 BLOC 2
 */
export interface EventPublisher {
  publish<T>(event: Omit<DomainEvent<T>, "event_id" | "occurred_at">): Promise<DomainEvent<T>>;
}

export function createPublisher(pool: Pool): EventPublisher {
  return {
    async publish<T>(partial: Omit<DomainEvent<T>, "event_id" | "occurred_at">): Promise<DomainEvent<T>> {
      const event: DomainEvent<T> = {
        ...partial,
        event_id: randomUUID(),
        occurred_at: new Date().toISOString(),
      };

      await pool.query(
        `INSERT INTO domain_events (id, event_name, event_version, tenant_id, occurred_at, produced_by, correlation_id, payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          event.event_id,
          event.event_name,
          event.event_version,
          event.tenant_id,
          event.occurred_at,
          event.produced_by,
          event.correlation_id ?? null,
          JSON.stringify(event.payload),
        ],
      );

      return event;
    },
  };
}
