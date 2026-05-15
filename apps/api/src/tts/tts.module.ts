import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { MediaModule } from "../media/media.module.js";
import { LearningModule } from "../learning/learning.module.js";
import { TtsController } from "./tts.controller.js";
import { TtsService } from "./tts.service.js";

@Module({
  imports: [PrismaModule, MediaModule, LearningModule],
  controllers: [TtsController],
  providers: [TtsService],
})
export class TtsModule {}
