import * as assert from "node:assert/strict";
import { test } from "node:test";
import { HealthController } from "./health.controller";

test("health endpoint returns service status", () => {
  const response = new HealthController().health();

  assert.equal(response.status, "ok");
  assert.equal(response.service, "goneops-api");
  assert.match(response.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("readiness and liveness endpoints share health contract", () => {
  const controller = new HealthController();

  assert.equal(controller.ready().status, "ok");
  assert.equal(controller.live().status, "ok");
});
