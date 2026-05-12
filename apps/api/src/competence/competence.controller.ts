import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
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
  @Roles("admin", "super_admin")
  async create(@Body() dto: CreateCompetenceDto) {
    return this.competenceService.create(dto);
  }

  @Patch(":id")
  @Roles("admin", "super_admin")
  async update(@Param("id") id: string, @Body() dto: UpdateCompetenceDto) {
    return this.competenceService.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "super_admin")
  async remove(@Param("id") id: string) {
    return this.competenceService.remove(id);
  }
}
