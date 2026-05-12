// Refs: SPEC-CONTENT.md §3.1 — POST /media/upload/:moduleId
import {
  Controller, Post, Param, UploadedFile,
  UseInterceptors, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Roles } from "../auth/roles.decorator.js";
import { MediaService } from "./media.service.js";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("upload/:moduleId")
  @Roles("admin", "trainer", "super_admin")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB hard cap côté multer
    })
  )
  upload(
    @Param("moduleId") moduleId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file) throw new BadRequestException("Aucun fichier reçu");
    return this.mediaService.upload(moduleId, file);
  }
}
