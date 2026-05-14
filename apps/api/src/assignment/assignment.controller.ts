import { Controller, Get, Post, Delete, Param, Body, Query, HttpCode, HttpStatus } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { AssignmentService, type CreateAssignmentDto } from "./assignment.service.js";
import type { AuthUser } from "../auth/auth.types.js";

// Refs: SPEC.md §7 — assignation module/parcours

@Controller("assignments")
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @RequirePermissions("assignment.create")
  create(@CurrentUser() caller: AuthUser, @Body() dto: CreateAssignmentDto) {
    return this.assignmentService.create(caller, dto);
  }

  @Get()
  @RequirePermissions("assignment.read")
  list(
    @CurrentUser() caller: AuthUser,
    @Query("assignee_id") assigneeId?: string,
    @Query("resource_type") resourceType?: string,
  ) {
    return this.assignmentService.list(caller, { assignee_id: assigneeId, resource_type: resourceType });
  }

  @Get("assignee/:assigneeId")
  @RequirePermissions("assignment.read")
  listForAssignee(@CurrentUser() caller: AuthUser, @Param("assigneeId") assigneeId: string) {
    return this.assignmentService.listForAssignee(caller, assigneeId);
  }

  @Delete(":id")
  @RequirePermissions("assignment.delete")
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() caller: AuthUser, @Param("id") id: string) {
    return this.assignmentService.remove(caller, id);
  }
}
