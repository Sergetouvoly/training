import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { CompetenceService } from "./competence.service.js";
import { CompetenceController } from "./competence.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [CompetenceController],
  providers: [CompetenceService],
  exports: [CompetenceService],
})
export class CompetenceModule {}
