import { Module } from "@nestjs/common";
import { AssignmentController } from "./assignment.controller.js";
import { AssignmentService } from "./assignment.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { SocialModule } from "../social/social.module.js";

@Module({
  imports: [PrismaModule, SocialModule],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
