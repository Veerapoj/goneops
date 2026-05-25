import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ProjectGeneratorController } from "./project-generator.controller";
import { ProjectGeneratorService } from "./project-generator.service";
import { QuickStartGeneratorController } from "./quickstart-generator.controller";
import { QuickStartGeneratorService } from "./quickstart-generator.service";

@Module({
  imports: [],
  controllers: [HealthController, ProjectGeneratorController, QuickStartGeneratorController],
  providers: [ProjectGeneratorService, QuickStartGeneratorService]
})
export class AppModule {}
