// Refs: dev_idea.txt — endpoints TTS pour générer/prévisualiser l'audio d'un module
import { Controller, Post, Get, Param, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { RequirePermissions } from "../auth/permissions.decorator.js";
import { TtsService, type GenerateAudioDto } from "./tts.service.js";

@Controller("tts")
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  // Health check du microservice TTS — utilisé par l'UI pour vérifier la disponibilité
  @Get("health")
  @RequirePermissions("tts.generate")
  health() {
    return this.ttsService.checkHealth();
  }

  // Aperçu du texte qui sera envoyé au TTS (longueur, présence d'un audio existant)
  @Get("preview/:moduleId")
  @RequirePermissions("tts.generate")
  preview(@Param("moduleId") moduleId: string) {
    return this.ttsService.previewText(moduleId);
  }

  // Génère l'audio et l'attache au module
  @Post("generate/:moduleId")
  @RequirePermissions("tts.generate")
  @HttpCode(HttpStatus.OK)
  generate(@Param("moduleId") moduleId: string, @Body() dto: GenerateAudioDto) {
    return this.ttsService.generateForModule(moduleId, dto);
  }
}
