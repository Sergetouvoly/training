import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import pg from "pg";

// Refs: SPEC.md §4 R-1.4 — tenant isolation via RLS
// Refs: ADR-0003 — RLS PostgreSQL

// Superuser pool for setup/teardown (bypasses RLS)
const ADMIN_URL = process.env.DATABASE_URL ?? "postgresql://elearning:elearning_dev@localhost:5433/elearning_dev";
// Non-superuser pool for RLS-enforced queries
const APP_URL = "postgresql://app_user:app_user_dev@localhost:5433/elearning_dev";

let adminPool: pg.Pool;
let appPool: pg.Pool;

beforeAll(() => {
  adminPool = new pg.Pool({ connectionString: ADMIN_URL });
  appPool = new pg.Pool({ connectionString: APP_URL });
});

afterAll(async () => {
  await appPool.end();
  await adminPool.end();
});

beforeEach(async () => {
  // Clean tables with admin (superuser bypasses RLS for DELETE)
  await adminPool.query("DELETE FROM stamps");
  await adminPool.query("DELETE FROM learners");
  await adminPool.query("DELETE FROM competences");
  await adminPool.query("DELETE FROM modules");
  await adminPool.query("DELETE FROM learning_paths");
  await adminPool.query("DELETE FROM evaluation_items");
  await adminPool.query("DELETE FROM domain_events");
  await adminPool.query("DELETE FROM tenants");
});

async function createTenant(name: string, slug: string): Promise<string> {
  const res = await adminPool.query(
    "INSERT INTO tenants (id, slug, name, updated_at) VALUES (gen_random_uuid(), $1, $2, now()) RETURNING id",
    [slug, name],
  );
  return res.rows[0].id;
}

async function queryAsTenant(tenantId: string, sql: string, params: unknown[] = []): Promise<pg.QueryResult> {
  const client = await appPool.connect();
  try {
    await client.query(`SET app.current_tenant = '${tenantId}'`);
    return await client.query(sql, params);
  } finally {
    await client.query("RESET app.current_tenant");
    client.release();
  }
}

describe("RLS tenant isolation", () => {
  it("it_does_not_leak_across_tenants — learners", async () => {
    const tenantA = await createTenant("Tenant A", "tenant-a");
    const tenantB = await createTenant("Tenant B", "tenant-b");

    await adminPool.query(
      "INSERT INTO learners (id, tenant_id, email, display_name, primary_role, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, now())",
      [tenantA, "alice@a.com", "Alice", "developer"],
    );
    await adminPool.query(
      "INSERT INTO learners (id, tenant_id, email, display_name, primary_role, updated_at) VALUES (gen_random_uuid(), $1, $2, $3, $4, now())",
      [tenantB, "bob@b.com", "Bob", "manager"],
    );

    const resultA = await queryAsTenant(tenantA, "SELECT * FROM learners");
    expect(resultA.rows).toHaveLength(1);
    expect(resultA.rows[0].email).toBe("alice@a.com");

    const resultB = await queryAsTenant(tenantB, "SELECT * FROM learners");
    expect(resultB.rows).toHaveLength(1);
    expect(resultB.rows[0].email).toBe("bob@b.com");
  });

  it("it_does_not_leak_across_tenants — tenants table", async () => {
    const tenantA = await createTenant("Tenant A", "tenant-a");
    await createTenant("Tenant B", "tenant-b");

    const result = await queryAsTenant(tenantA, "SELECT * FROM tenants");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].slug).toBe("tenant-a");
  });

  it("it_does_not_leak_across_tenants — domain_events", async () => {
    const tenantA = await createTenant("Tenant A", "tenant-a");
    const tenantB = await createTenant("Tenant B", "tenant-b");

    await adminPool.query(
      "INSERT INTO domain_events (id, event_name, event_version, tenant_id, produced_by, payload) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)",
      ["TenantOnboarded", "1.0", tenantA, "test", '{"slug":"tenant-a"}'],
    );
    await adminPool.query(
      "INSERT INTO domain_events (id, event_name, event_version, tenant_id, produced_by, payload) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)",
      ["TenantOnboarded", "1.0", tenantB, "test", '{"slug":"tenant-b"}'],
    );

    const resultA = await queryAsTenant(tenantA, "SELECT * FROM domain_events");
    expect(resultA.rows).toHaveLength(1);
    expect(resultA.rows[0].tenant_id).toBe(tenantA);

    const resultB = await queryAsTenant(tenantB, "SELECT * FROM domain_events");
    expect(resultB.rows).toHaveLength(1);
    expect(resultB.rows[0].tenant_id).toBe(tenantB);
  });

  it("it_does_not_leak_across_tenants — stamps", async () => {
    const tenantA = await createTenant("Tenant A", "tenant-a");
    const tenantB = await createTenant("Tenant B", "tenant-b");

    const learnerA = (await adminPool.query(
      "INSERT INTO learners (id, tenant_id, email, display_name, primary_role, updated_at) VALUES (gen_random_uuid(), $1, 'a@a.com', 'A', 'developer', now()) RETURNING id",
      [tenantA],
    )).rows[0].id;
    const learnerB = (await adminPool.query(
      "INSERT INTO learners (id, tenant_id, email, display_name, primary_role, updated_at) VALUES (gen_random_uuid(), $1, 'b@b.com', 'B', 'manager', now()) RETURNING id",
      [tenantB],
    )).rows[0].id;
    const compA = (await adminPool.query(
      "INSERT INTO competences (id, tenant_id, code, label_fr, label_en) VALUES (gen_random_uuid(), $1, 'SEC-001', 'Sécurité', 'Security') RETURNING id",
      [tenantA],
    )).rows[0].id;
    const compB = (await adminPool.query(
      "INSERT INTO competences (id, tenant_id, code, label_fr, label_en) VALUES (gen_random_uuid(), $1, 'FIN-001', 'Finance', 'Finance') RETURNING id",
      [tenantB],
    )).rows[0].id;

    await adminPool.query(
      `INSERT INTO stamps (id, tenant_id, learner_id, competence_id, state, validated_at, expires_at, module_version_hash, performance_score)
       VALUES (gen_random_uuid(), $1, $2, $3, 'green', now(), now() + interval '12 months', 'hash-a', 85)`,
      [tenantA, learnerA, compA],
    );
    await adminPool.query(
      `INSERT INTO stamps (id, tenant_id, learner_id, competence_id, state, validated_at, expires_at, module_version_hash, performance_score)
       VALUES (gen_random_uuid(), $1, $2, $3, 'green', now(), now() + interval '12 months', 'hash-b', 90)`,
      [tenantB, learnerB, compB],
    );

    const resultA = await queryAsTenant(tenantA, "SELECT * FROM stamps");
    expect(resultA.rows).toHaveLength(1);
    expect(resultA.rows[0].tenant_id).toBe(tenantA);

    const resultB = await queryAsTenant(tenantB, "SELECT * FROM stamps");
    expect(resultB.rows).toHaveLength(1);
    expect(resultB.rows[0].tenant_id).toBe(tenantB);
  });

  it("evaluation_items with tenant_id NULL are visible to all tenants", async () => {
    const tenantA = await createTenant("Tenant A", "tenant-a");

    await adminPool.query(
      "INSERT INTO evaluation_items (id, tenant_id, bank_id, format, difficulty, bloom_level, concept_tags) VALUES (gen_random_uuid(), NULL, 'global', 'qcm_single', 2, 3, '{}')",
    );
    await adminPool.query(
      "INSERT INTO evaluation_items (id, tenant_id, bank_id, format, difficulty, bloom_level, concept_tags) VALUES (gen_random_uuid(), $1, 'bank-a', 'true_false', 1, 1, '{}')",
      [tenantA],
    );

    const result = await queryAsTenant(tenantA, "SELECT * FROM evaluation_items");
    expect(result.rows).toHaveLength(2); // shared + tenant-specific
  });
});
