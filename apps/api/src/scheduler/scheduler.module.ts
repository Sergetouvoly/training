import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SocialModule } from "../social/social.module.js";
import { SchedulerService } from "./scheduler.service.js";

@Module({
  imports: [PrismaModule, SocialModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
