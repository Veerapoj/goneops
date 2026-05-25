import { Body, Controller, Get, Post } from "@nestjs/common";
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
}
