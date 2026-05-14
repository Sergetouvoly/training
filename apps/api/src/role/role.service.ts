import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Permission } from "@elearning/domain";
import { isPermission } from "@elearning/domain";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async createRole(dto: { code: string; label_fr: string; label_en: string; created_by: string }) {
    const existing = await this.prisma.role.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException(`Role ${dto.code} already exists`);

    const role = await this.prisma.role.create({
      data: {
        id: randomUUID(),
        code: dto.code,
        label_fr: dto.label_fr,
        label_en: dto.label_en,
        is_system: false,
      },
    });
    await this.emit("RoleCreated", dto.created_by, {
      role_id: role.id,
      role_code: role.code,
      created_by: dto.created_by,
    });
    return role;
  }

  async deleteRole(roleId: string, deletedBy: string) {
    const role = await this.findRole(roleId);
    if (role.is_system) throw new ForbiddenException("System roles cannot be deleted");
    await this.prisma.role.delete({ where: { id: roleId } });
    await this.emit("RoleDeleted", deletedBy, {
      role_id: role.id,
      role_code: role.code,
      deleted_by: deletedBy,
    });
  }

  async grantRole(userId: string, roleId: string, grantedBy: string) {
    const role = await this.findRole(roleId);
    const userRole = await this.prisma.userRole.upsert({
      where: { user_id_role_id: { user_id: userId, role_id: roleId } },
      update: { granted_by: grantedBy },
      create: { user_id: userId, role_id: roleId, granted_by: grantedBy },
    });
    await this.emit("UserRoleGranted", grantedBy, {
      user_id: userId,
      role_id: role.id,
      role_code: role.code,
      granted_by: grantedBy,
    });
    return userRole;
  }

  async revokeRole(userId: string, roleId: string, revokedBy: string) {
    const role = await this.findRole(roleId);
    await this.prisma.userRole.delete({ where: { user_id_role_id: { user_id: userId, role_id: roleId } } });
    await this.emit("UserRoleRevoked", revokedBy, {
      user_id: userId,
      role_id: role.id,
      role_code: role.code,
      revoked_by: revokedBy,
    });
  }

  async setRolePermissions(roleId: string, permissions: readonly Permission[], changedBy: string) {
    const role = await this.findRole(roleId);
    const uniquePermissions = [...new Set(permissions)];
    for (const permission of uniquePermissions) {
      if (!isPermission(permission)) throw new NotFoundException(`Permission ${permission} not found`);
    }

    const current = await this.prisma.rolePermission.findMany({
      where: { role_id: roleId },
      include: { permission: true },
    });
    const currentCodes = new Set(current.map((rp: any) => rp.permission.code));
    const nextCodes = new Set(uniquePermissions);
    const added = uniquePermissions.filter((code) => !currentCodes.has(code));
    const removed = [...currentCodes].filter((code) => !nextCodes.has(code));

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          role_id: roleId,
          permission: { code: { in: removed } },
        },
      });
      for (const code of added) {
        const permission = await tx.permission.findUniqueOrThrow({ where: { code } });
        await tx.rolePermission.create({
          data: { role_id: roleId, permission_id: permission.id },
        });
      }
    });

    await this.emit("RolePermissionsChanged", changedBy, {
      role_id: role.id,
      role_code: role.code,
      added,
      removed,
      changed_by: changedBy,
    });
  }

  async listAll() {
    return this.prisma.role.findMany({
      orderBy: [{ is_system: "desc" }, { created_at: "asc" }],
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { verb: "asc" }],
    });
  }

  async getRoleWithPermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    return { ...role, permission_codes: role.permissions.map((rp: any) => rp.permission.code as string) };
  }

  async getUserRoles(userId: string) {
    const rows = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
      orderBy: { granted_at: "asc" },
    });
    return rows.map((ur: any) => ({
      ...ur,
      role: {
        ...ur.role,
        permission_codes: ur.role.permissions.map((rp: any) => rp.permission.code as string),
      },
    }));
  }

  private async findRole(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException(`Role ${roleId} not found`);
    return role;
  }

  private async emit(eventName: string, producedBy: string, payload: Record<string, unknown>) {
    await this.prisma.domainEvent.create({
      data: {
        id: randomUUID(),
        event_name: eventName,
        event_version: "1",
        produced_by: producedBy,
        payload: payload as any,
      },
    });
  }
}
