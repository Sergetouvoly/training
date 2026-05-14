import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { CompetenceService, type CreateCompetenceDto, type UpdateCompetenceDto } from "./competence.service.js";

// Refs: SPEC.md §7

@Controller("competences")
export class CompetenceController {
  constructor(private readonly competenceService: CompetenceService) {}

  @Get()
  async listAll() {
    return this.competenceService.listAll();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.competenceService.findById(id);
  }

  @Post()
  @RequirePermissions("competence.create")
  async create(@Body() dto: CreateCompetenceDto) {
    return this.competenceService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("competence.update")
  async update(@Param("id") id: string, @Body() dto: UpdateCompetenceDto) {
    return this.competenceService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermissions("competence.delete")
  async remove(@Param("id") id: string) {
    return this.competenceService.remove(id);
  }
}


