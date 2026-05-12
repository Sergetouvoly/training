import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { ItemService, type CreateItemDto, type UpdateItemDto } from "./item.service.js";
import { EvaluationService, type SubmitEvaluationDto } from "./evaluation.service.js";
import { CsvImportService } from "./csv-import.service.js";

// Refs: SPEC.md §11 US-1.3, US-1.6

@Controller("assessment")
export class AssessmentController {
  constructor(
    private readonly itemService: ItemService,
    private readonly evaluationService: EvaluationService,
    private readonly csvImportService: CsvImportService,
  ) {}

  @Get("items")
  @Roles("admin", "trainer", "super_admin")
  async listItems() {
    return this.itemService.listAll();
  }

  @Post("items")
  @Roles("admin", "trainer", "super_admin")
  async createItem(@Body() dto: CreateItemDto) {
    return this.itemService.create(dto);
  }

  @Patch("items/:id")
  @Roles("admin", "trainer", "super_admin")
  async updateItem(@Param("id") id: string, @Body() dto: UpdateItemDto) {
    return this.itemService.update(id, dto);
  }

  @Delete("items/:id")
  @Roles("admin", "trainer", "super_admin")
  async deleteItem(@Param("id") id: string) {
    return this.itemService.remove(id);
  }

  @Get("items/bank/:bankId")
  async listByBank(@Param("bankId") bankId: string) {
    return this.itemService.listByBank(bankId);
  }

  @Get("items/draw")
  async drawItems(
    @Query("bank_id") bankId: string,
    @Query("count") count: string,
  ) {
    return this.itemService.drawStratified({ bank_id: bankId, count: Number.parseInt(count, 10) || 5 });
  }

  @Post("items/import-csv")
  @Roles("admin", "trainer", "super_admin")
  async importItemsCsv(@Body("csv") csv: string) {
    return this.csvImportService.importCsv(csv);
  }

  @Post("evaluate")
  async submitEvaluation(@Body() dto: SubmitEvaluationDto) {
    return this.evaluationService.submit(dto);
  }
}
