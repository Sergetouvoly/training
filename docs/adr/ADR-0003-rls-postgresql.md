# ADR-0003: Row Level Security PostgreSQL

## Status
Accepted

## Context
Multi-tenant isolation is a P0 requirement (SPEC.md §4, R-1.4). Every query must be scoped by `tenant_id`. RLS provides database-level enforcement as a safety net beyond application-level filtering.

## Decision
- Enable RLS on all tenant-scoped tables.
- Use `current_setting('app.current_tenant', true)` as the tenant discriminator.
- The application sets `SET app.current_tenant = '<tenant_id>'` at the beginning of each database session/transaction.
- `evaluation_items` allows `tenant_id IS NULL` for shared items.

## Consequences
- Cross-tenant data leaks are blocked at the DB level even if application code has a bug.
- Every new table with `tenant_id` must have a matching RLS policy.
- Integration tests must verify RLS with `it_does_not_leak_across_tenants`.
- Prisma migrations run as superuser (bypasses RLS). App connections use a restricted role.
