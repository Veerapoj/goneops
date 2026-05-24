import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  const logger = new Logger("GoneOpsBootstrap");
  const port = Number(process.env.BACKEND_PORT ?? 4000);

  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"
  });

  await app.listen(port);
  logger.log(
    JSON.stringify({
      event: "backend_started",
      service: "goneops-api",
      port
    })
  );
}

void bootstrap();
