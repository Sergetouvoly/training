import { Module } from "@nestjs/common";
import { ItemService } from "./item.service.js";
import { EvaluationService } from "./evaluation.service.js";
import { CsvImportService } from "./csv-import.service.js";
import { AssessmentController } from "./assessment.controller.js";

@Module({
  controllers: [AssessmentController],
  providers: [ItemService, EvaluationService, CsvImportService],
  exports: [ItemService, EvaluationService, CsvImportService],
})
export class AssessmentModule {}
