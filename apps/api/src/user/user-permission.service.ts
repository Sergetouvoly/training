import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PERMISSIONS, isPermission } from "@elearning/domain";

@Injectable()
export class UserPermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    await this.assertUserExists(userId);
    return this.prisma.userPermission.findMany({
      where: { user_id: userId },
      include: { permission: true },
      orderBy: [{ type: "asc" }, { permission: { code: "asc" } }],
    });
  }

  // Tous les grants/denys directs de la plateforme — pour la vue /admin/permissions
  async listAllGrants() {
    const rows = await this.prisma.userPermission.findMany({
      include: {
        permission: true,
        user: { select: { id: true, display_name: true, email: true, app_role: true } },
      },
      orderBy: [{ permission: { code: "asc" } }, { type: "asc" }],
    });
    // Groupé par permission code
    const byCode = new Map<string, { permission_code: string; grants: typeof rows }>();
    for (const row of rows) {
      const code = row.permission.code;
      const existing = byCode.get(code) ?? { permission_code: code, grants: [] };
      existing.grants.push(row);
      byCode.set(code, existing);
    }
    return Object.fromEntries(byCode);
  }

  async upsert(userId: string, permissionCode: string, type: "grant" | "deny", grantedBy: string) {
    await this.assertUserExists(userId);
    if (!isPermission(permissionCode)) {
      throw new NotFoundException(`Permission inconnue : ${permissionCode}`);
    }
    const permission = await this.prisma.permission.findUnique({ where: { code: permissionCode } });
    if (!permission) throw new NotFoundException(`Permission ${permissionCode} absente en BDD`);

    return this.prisma.userPermission.upsert({
      where: { user_id_permission_id: { user_id: userId, permission_id: permission.id } },
      update: { type, granted_by: grantedBy },
      create: { user_id: userId, permission_id: permission.id, type, granted_by: grantedBy },
      include: { permission: true },
    });
  }

  async remove(userId: string, permissionCode: string) {
    await this.assertUserExists(userId);
    const permission = await this.prisma.permission.findUnique({ where: { code: permissionCode } });
    if (!permission) throw new NotFoundException(`Permission ${permissionCode} absente en BDD`);

    const existing = await this.prisma.userPermission.findUnique({
      where: { user_id_permission_id: { user_id: userId, permission_id: permission.id } },
    });
    if (!existing) throw new NotFoundException(`Aucune permission directe ${permissionCode} sur cet utilisateur`);

    await this.prisma.userPermission.delete({
      where: { user_id_permission_id: { user_id: userId, permission_id: permission.id } },
    });
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
  }
}
