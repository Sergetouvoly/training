import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §7 — CRUD competences (admin + super_admin)

export interface CreateCompetenceDto {
  readonly code: string;
  readonly label_fr: string;
  readonly label_en: string;
}

export interface UpdateCompetenceDto {
  readonly label_fr?: string;
  readonly label_en?: string;
}

@Injectable()
export class CompetenceService {
  constructor(private readonly prisma: PrismaService) {}

  async listAll() {
    return this.prisma.competence.findMany({ where: { deleted_at: null }, orderBy: { code: "asc" } });
  }

  async findById(id: string) {
    const c = await this.prisma.competence.findFirst({ where: { id, deleted_at: null } });
    if (!c) throw new NotFoundException(`Competence ${id} not found`);
    return c;
  }

  async create(dto: CreateCompetenceDto) {
    const existing = await this.prisma.competence.findFirst({ where: { code: dto.code, deleted_at: null } });
    if (existing) throw new ConflictException(`Code ${dto.code} already exists`);
    return this.prisma.competence.create({ data: { code: dto.code, label_fr: dto.label_fr, label_en: dto.label_en } });
  }

  async update(id: string, dto: UpdateCompetenceDto) {
    await this.findById(id);
    return this.prisma.competence.update({
      where: { id },
      data: {
        ...(dto.label_fr !== undefined && { label_fr: dto.label_fr }),
        ...(dto.label_en !== undefined && { label_en: dto.label_en }),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.competence.update({ where: { id }, data: { deleted_at: new Date() } });
  }
}
