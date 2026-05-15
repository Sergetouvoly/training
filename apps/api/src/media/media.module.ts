import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "node:path";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";

const UPLOAD_ROOT = process.env["UPLOAD_DIR"] ?? join(process.cwd(), "uploads");

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: UPLOAD_ROOT,
      serveRoot: "/media",
      serveStaticOptions: { index: false, fallthrough: false },
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
