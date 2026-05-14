import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-2b.5 — email via nodemailer SMTP, config dans AppConfig

@Injectable()
export class EmailService {
  constructor(private readonly prisma: PrismaService) {}

  async send(to: string, subject: string, html: string): Promise<void> {
    const [hostCfg, portCfg, userCfg, passCfg] = await Promise.all([
      this.prisma.appConfig.findUnique({ where: { key: "smtp_host" } }),
      this.prisma.appConfig.findUnique({ where: { key: "smtp_port" } }),
      this.prisma.appConfig.findUnique({ where: { key: "smtp_user" } }),
      this.prisma.appConfig.findUnique({ where: { key: "smtp_pass" } }),
    ]);

    if (!hostCfg?.value) return; // SMTP non configuré — no-op silencieux

    const transporter = nodemailer.createTransport({
      host: hostCfg.value as string,
      port: (portCfg?.value as number) ?? 587,
      secure: ((portCfg?.value as number) ?? 587) === 465,
      auth: {
        user: userCfg?.value as string | undefined,
        pass: passCfg?.value as string | undefined,
      },
    });

    await transporter.sendMail({
      from: '"Holenek LMS" <no-reply@holenek.fr>',
      to,
      subject,
      html,
    });
  }

  async getPlatformUrl(): Promise<string> {
    const cfg = await this.prisma.appConfig.findUnique({ where: { key: "platform_url" } });
    return (cfg?.value as string) ?? "http://localhost:3000";
  }
}
