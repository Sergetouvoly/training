import { Module } from "@nestjs/common";
import { AiNestService } from "./ai.service.js";
import { AiController } from "./ai.controller.js";

@Module({
  controllers: [AiController],
  providers: [AiNestService],
  exports: [AiNestService],
})
export class AiModule {}
