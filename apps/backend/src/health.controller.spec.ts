import * as assert from "node:assert/strict";
import { test } from "node:test";
import { HealthController } from "./health.controller";

test("health endpoint returns service status with observability ids", () => {
  const response = new HealthController().health("phase5-request");

  assert.equal(response.status, "ok");
  assert.equal(response.service, "goneops-api");
  assert.equal(response.request_id, "phase5-request");
  assert.match(response.trace_id, /^[a-fA-F0-9]{32}$/);
  assert.match(response.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("readiness and liveness endpoints share health contract", () => {
  const controller = new HealthController();

  assert.equal(controller.ready("ready-request").request_id, "ready-request");
  assert.equal(controller.live("live-request").status, "ok");
});
