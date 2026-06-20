# GoneOps MVP Review

Review date: 2026-06-20

Verdict: REJECT

The implementation builds, but it does not satisfy the architecture verification gates and is
not ready to advance to testing.

Release-blocking findings:

1. `backend/src/routes/projects.js` performs direct SQL and synchronous filesystem access.
2. Service selection has no validated `PUT /api/projects/:id/services` round trip.
3. `POST /api/projects/:id/databases/test` is missing; the UI tests the whole sandbox API instead.
4. Sandbox generation writes inline templates directly into the advertised final directory and
   lacks compare-and-set generation state, atomic replacement, and coordinated rollback.
5. Lifecycle operations do not use conditional state transitions, so concurrent requests can
   both be accepted; stale transitional states are not reconciled on startup.
6. Pipeline runs are not environment-scoped and no concurrent-run conflict is enforced.
7. Error responses do not use the required structured error envelope consistently.
8. There are no automated tests for ownership, traversal/symlink escape, port concurrency,
   lifecycle conflicts, masked secrets, Docker unavailability, or terminal safety.
9. The required safe container terminal transport is absent. The frontend now reports this
   honestly as unavailable instead of attempting a WebSocket connection to a nonexistent route.

Safety corrections applied during review:

- Secret list and mutation responses no longer expose plaintext values.
- Database metadata no longer returns a plaintext connection string.
- Simulated pipeline logs are explicitly labeled and no longer claim real commands ran.
- Seed data no longer advertises a nonexistent running sandbox or deployment.
- Seed web runtime metadata now uses port 8080 and Node.js 20 consistently.
