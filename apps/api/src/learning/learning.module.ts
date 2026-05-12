import { Module } from "@nestjs/common";
import { LearningService } from "./learning.service.js";
import { ProgressionService } from "./progression.service.js";
import { LearningController } from "./learning.controller.js";

@Module({
  controllers: [LearningController],
  providers: [LearningService, ProgressionService],
  exports: [LearningService, ProgressionService],
})
export class LearningModule {}
