import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { QuickStartGeneratorService } from "./quickstart-generator.service";
import { DeleteQuickStartProjectRequest, GenerateQuickStartRequest } from "./quickstart-generator.types";

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

  @Get("projects")
  projects() {
    return { projects: this.quickStartGenerator.listProjects() };
  }

  @Get("projects/:slug")
  project(@Param("slug") slug: string) {
    const project = this.quickStartGenerator.getProject(slug);
    if (!project) {
      throw new NotFoundException(`QuickStart project not found: ${slug}`);
    }
    return project;
  }

  @Delete("projects/:slug")
  deleteProject(@Param("slug") slug: string, @Body() request: DeleteQuickStartProjectRequest) {
    try {
      const result = this.quickStartGenerator.deleteProject(slug, request);
      if (!result) {
        throw new NotFoundException(`QuickStart project not found: ${slug}`);
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException(error instanceof Error ? error.message : "Project deletion failed");
    }
  }
}
