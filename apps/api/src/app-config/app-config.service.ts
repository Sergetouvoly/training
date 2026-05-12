import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §7 — AppConfig R+U (super_admin), R (admin)

@Injectable()
export class AppConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.appConfig.findMany({ orderBy: { key: "asc" } });
  }

  async getByKey(key: string) {
    const entry = await this.prisma.appConfig.findUnique({ where: { key } });
    if (!entry) throw new NotFoundException(`Config key "${key}" not found`);
    return entry;
  }

  async set(key: string, value: unknown) {
    return this.prisma.appConfig.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    });
  }
}
