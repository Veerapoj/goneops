import { Controller, Get, Headers } from "@nestjs/common";

type HealthResponse = {
  status: "ok";
  service: "goneops-api";
  timestamp: string;
  request_id: string;
  trace_id: string;
};

function normalizeRequestId(requestId?: string): string {
  const value = requestId?.trim();
  if (value) {
    return value;
  }
  return crypto.randomUUID();
}

function traceIdFromRequestId(requestId: string): string {
  return requestId.replace(/[^a-fA-F0-9]/g, "").padEnd(32, "0").slice(0, 32);
}

@Controller()
export class HealthController {
  @Get("health")
  health(@Headers("x-request-id") requestId?: string): HealthResponse {
    const request_id = normalizeRequestId(requestId);
    return {
      status: "ok",
      service: "goneops-api",
      timestamp: new Date().toISOString(),
      request_id,
      trace_id: traceIdFromRequestId(request_id)
    };
  }

  @Get("ready")
  ready(@Headers("x-request-id") requestId?: string): HealthResponse {
    return this.health(requestId);
  }

  @Get("live")
  live(@Headers("x-request-id") requestId?: string): HealthResponse {
    return this.health(requestId);
  }
}
