import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AuthModule } from "./auth/auth.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { LearningModule } from "./learning/learning.module.js";
import { AssessmentModule } from "./assessment/assessment.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { UserModule } from "./user/user.module.js";
import { CompetenceModule } from "./competence/competence.module.js";
import { AppConfigModule } from "./app-config/app-config.module.js";
import { SimulatorModule } from "./simulator/simulator.module.js";
import { SocialModule } from "./social/social.module.js";
import { AiModule } from "./ai/ai.module.js";
import { MediaModule } from "./media/media.module.js";
import { RoleModule } from "./role/role.module.js";
import { TrashModule } from "./trash/trash.module.js";
import { AssignmentModule } from "./assignment/assignment.module.js";
import { SchedulerModule } from "./scheduler/scheduler.module.js";
import { TtsModule } from "./tts/tts.module.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    LearningModule,
    AssessmentModule,
    AuditModule,
    UserModule,
    CompetenceModule,
    AppConfigModule,
    SimulatorModule,
    SocialModule,
    AiModule,
    MediaModule,
    RoleModule,
    TrashModule,
    AssignmentModule,
    SchedulerModule,
    TtsModule,
  ],
})
export class AppModule {}
