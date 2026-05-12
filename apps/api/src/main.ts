import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger — disponible uniquement hors production
  if (process.env["NODE_ENV"] !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Holenek API")
      .setDescription("API e-learning Holenek — authentification JWT Bearer")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`Swagger disponible sur http://localhost:${process.env["PORT"] ?? 3001}/api/docs`);
  }

  const port = process.env["PORT"] ?? 3001;
  await app.listen(port);
  console.log(`API listening on port ${port}`);
}

bootstrap();
