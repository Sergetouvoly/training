import type { Client } from "pg";

export interface EventNotification {
  id: string;
  event_name: string;
  tenant_id: string;
}

export type EventHandler = (notification: EventNotification) => void | Promise<void>;

/**
 * Listens to PG NOTIFY on the 'domain_event' channel.
 * Refs: SPEC.md §6, WORKFLOW.md §6 BLOC 2
 */
export interface EventConsumer {
  subscribe(handler: EventHandler): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createConsumer(client: Client): EventConsumer {
  const handlers: EventHandler[] = [];

  client.on("notification", async (msg) => {
    if (msg.channel !== "domain_event" || !msg.payload) return;
    const notification: EventNotification = JSON.parse(msg.payload);
    for (const handler of handlers) {
      await handler(notification);
    }
  });

  return {
    subscribe(handler: EventHandler) {
      handlers.push(handler);
    },

    async start() {
      await client.query("LISTEN domain_event");
    },

    async stop() {
      await client.query("UNLISTEN domain_event");
    },
  };
}
