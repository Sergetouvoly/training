import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { AppConfigService } from "./app-config.service.js";

// Refs: SPEC.md §7 — R+U super_admin, R admin

@Controller("config")
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  @RequirePermissions("app_config.read")
  async listAll() {
    return this.appConfigService.listAll();
  }

  @Get(":key")
  @RequirePermissions("app_config.read")
  async getOne(@Param("key") key: string) {
    return this.appConfigService.getByKey(key);
  }

  @Put(":key")
  @RequirePermissions("app_config.write")
  async set(@Param("key") key: string, @Body("value") value: unknown) {
    return this.appConfigService.set(key, value);
  }
}


