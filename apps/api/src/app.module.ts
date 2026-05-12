import { Module } from "@nestjs/common";
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

@Module({
  imports: [
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
  ],
})
export class AppModule {}
