import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AppConfigService } from "./app-config.service.js";
import { AppConfigController } from "./app-config.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [AppConfigController],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
