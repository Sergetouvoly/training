import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { LitfService } from "./litf.service.js";
import { BuddyService } from "./buddy.service.js";
import { ChallengeService } from "./challenge.service.js";
import { NotificationService } from "./notification.service.js";
import { SocialController } from "./social.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [SocialController],
  providers: [LitfService, BuddyService, ChallengeService, NotificationService],
  exports: [NotificationService],
})
export class SocialModule {}
