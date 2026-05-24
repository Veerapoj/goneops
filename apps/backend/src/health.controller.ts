import { Controller, Get } from "@nestjs/common";

type HealthResponse = {
  status: "ok";
  service: "goneops-api";
  timestamp: string;
};

@Controller()
export class HealthController {
  @Get("health")
  health(): HealthResponse {
    return {
      status: "ok",
      service: "goneops-api",
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  ready(): HealthResponse {
    return this.health();
  }

  @Get("live")
  live(): HealthResponse {
    return this.health();
  }
}
