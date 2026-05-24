import { Body, Controller, Get, Post } from "@nestjs/common";
import { ProjectGeneratorService } from "./project-generator.service";
import { GenerateProjectRequest } from "./project-generator.types";

@Controller("projects")
export class ProjectGeneratorController {
  constructor(private readonly projectGenerator: ProjectGeneratorService) {}

  @Get("options")
  options() {
    return this.projectGenerator.getOptions();
  }

  @Post("generate")
  generate(@Body() request: GenerateProjectRequest) {
    return this.projectGenerator.generate(request);
  }
}
