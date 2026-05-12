import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SimulatorService } from "./simulator.service.js";
import { MasteryService } from "./mastery.service.js";
import { PassportService } from "./passport.service.js";
import { PassportExportService } from "./passport-export.service.js";
import { TeamAnalyticsService } from "./team-analytics.service.js";
import { VideoScenarioService } from "./video-scenario.service.js";
import { DebriefService } from "./debrief.service.js";
import { SimulatorController } from "./simulator.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [SimulatorController],
  providers: [
    SimulatorService, MasteryService, PassportService, PassportExportService,
    TeamAnalyticsService, VideoScenarioService, DebriefService,
  ],
  exports: [PassportService, MasteryService, TeamAnalyticsService, DebriefService],
})
export class SimulatorModule {}
