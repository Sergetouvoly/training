import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { ItemService, type CreateItemDto, type UpdateItemDto } from "./item.service.js";
import { EvaluationService, type SubmitEvaluationDto } from "./evaluation.service.js";
import { CsvImportService } from "./csv-import.service.js";
import { JsonImportService } from "./json-import.service.js";

// Refs: SPEC.md §11 US-1.3, US-1.6

@Controller("assessment")
export class AssessmentController {
  constructor(
    private readonly itemService: ItemService,
    private readonly evaluationService: EvaluationService,
    private readonly csvImportService: CsvImportService,
    private readonly jsonImportService: JsonImportService,
  ) {}

  @Get("items")
  @RequirePermissions("evaluation_item.read")
  async listItems() {
    return this.itemService.listAll();
  }

  @Post("items")
  @RequirePermissions("evaluation_item.create")
  async createItem(@Body() dto: CreateItemDto) {
    return this.itemService.create(dto);
  }

  @Patch("items/:id")
  @RequirePermissions("evaluation_item.update")
  async updateItem(@Param("id") id: string, @Body() dto: UpdateItemDto) {
    return this.itemService.update(id, dto);
  }

  @Delete("items/:id")
  @RequirePermissions("evaluation_item.delete")
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
  @RequirePermissions("evaluation_item.import_csv")
  async importItemsCsv(@Body("csv") csv: string) {
    return this.csvImportService.importCsv(csv);
  }

  @Post("items/import-json")
  @RequirePermissions("evaluation_item.import_csv")
  async importItemsJson(@Body("json") json: string) {
    return this.jsonImportService.importJson(json);
  }

  @Post("evaluate")
  async submitEvaluation(@Body() dto: SubmitEvaluationDto) {
    return this.evaluationService.submit(dto);
  }
}


