import { Controller, Get, Post, Delete, Param, Query, HttpCode, HttpStatus, BadRequestException } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { TrashService, type TrashType } from "./trash.service.js";

@Controller("trash")
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  @RequirePermissions("trash.read")
  list(@Query("type") type?: string) {
    if (type !== undefined && !this.trash.isValidType(type)) {
      throw new BadRequestException(`Invalid type: ${type}`);
    }
    return this.trash.listTrashed(type as TrashType | undefined);
  }

  @Post(":type/:id/restore")
  @RequirePermissions("trash.restore")
  restore(@Param("type") type: string, @Param("id") id: string) {
    if (!this.trash.isValidType(type)) throw new BadRequestException(`Invalid type: ${type}`);
    return this.trash.restore(type, id);
  }

  @Delete(":type/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions("trash.purge")
  async purgeOne(@Param("type") type: string, @Param("id") id: string) {
    if (!this.trash.isValidType(type)) throw new BadRequestException(`Invalid type: ${type}`);
    await this.trash.purge(type, id);
  }

  @Delete()
  @RequirePermissions("trash.purge")
  purgeExpired() {
    return this.trash.purgeExpired();
  }
}
