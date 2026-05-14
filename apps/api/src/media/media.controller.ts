// Refs: SPEC-CONTENT.md §3.1 — POST /media/upload/:moduleId
import {
  Controller, Post, Param, UploadedFile,
  UseInterceptors, BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { MediaService } from "./media.service.js";

@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("upload/:moduleId")
  @RequirePermissions("module.upload_media")
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


