import { NestFactory } from "@nestjs/core";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";

function traceIdFromRequestId(requestId: string): string {
  return requestId.replace(/[^a-fA-F0-9]/g, "").padEnd(32, "0").slice(0, 32);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const port = Number(process.env.BACKEND_PORT ?? 4000);

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin}`));
    }
  });

  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const request_id = request.header("x-request-id") ?? crypto.randomUUID();
    const trace_id = traceIdFromRequestId(request_id);

    response.setHeader("x-request-id", request_id);
    response.setHeader("traceparent", `00-${trace_id}-0000000000000001-01`);
    response.on("finish", () => {
      console.log(
        JSON.stringify({
          event: "http_request_completed",
          service: "goneops-api",
          request_id,
          trace_id,
          method: request.method,
          path: request.path,
          status_code: response.statusCode,
          duration_ms: Date.now() - startedAt
        })
      );
    });
    next();
  });

  await app.listen(port);
  console.log(
    JSON.stringify({
      event: "backend_started",
      service: "goneops-api",
      port,
      otel_baseline: "stdout-ready"
    })
  );
}

void bootstrap();
