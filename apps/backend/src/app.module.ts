import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ProjectGeneratorController } from "./project-generator.controller";
import { ProjectGeneratorService } from "./project-generator.service";

@Module({
  imports: [],
  controllers: [HealthController, ProjectGeneratorController],
  providers: [ProjectGeneratorService]
})
export class AppModule {}
