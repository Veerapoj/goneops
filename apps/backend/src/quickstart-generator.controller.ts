import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { QuickStartGeneratorService } from "./quickstart-generator.service";
import { GenerateQuickStartRequest } from "./quickstart-generator.types";

@Controller("quickstart")
export class QuickStartGeneratorController {
  constructor(private readonly quickStartGenerator: QuickStartGeneratorService) {}

  @Get("options")
  options() {
    return this.quickStartGenerator.getOptions();
  }

  @Post("generate")
  generate(@Body() request: GenerateQuickStartRequest) {
    return this.quickStartGenerator.generate(request);
  }

  @Get("projects/:slug")
  project(@Param("slug") slug: string) {
    const project = this.quickStartGenerator.getProject(slug);
    if (!project) {
      throw new NotFoundException(`QuickStart project not found: ${slug}`);
    }
    return project;
  }
}
