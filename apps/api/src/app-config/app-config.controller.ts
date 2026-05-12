import { Controller, Get, Put, Param, Body } from "@nestjs/common";
import { Roles } from "../auth/roles.decorator.js";
import { AppConfigService } from "./app-config.service.js";

// Refs: SPEC.md §7 — R+U super_admin, R admin

@Controller("config")
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  @Roles("super_admin", "admin")
  async listAll() {
    return this.appConfigService.listAll();
  }

  @Get(":key")
  @Roles("super_admin", "admin")
  async getOne(@Param("key") key: string) {
    return this.appConfigService.getByKey(key);
  }

  @Put(":key")
  @Roles("super_admin")
  async set(@Param("key") key: string, @Body("value") value: unknown) {
    return this.appConfigService.set(key, value);
  }
}
