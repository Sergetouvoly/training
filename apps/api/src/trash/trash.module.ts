import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module.js";
import { TrashService } from "./trash.service.js";
import { TrashController } from "./trash.controller.js";

@Module({
  imports: [PrismaModule],
  controllers: [TrashController],
  providers: [TrashService],
})
export class TrashModule {}
