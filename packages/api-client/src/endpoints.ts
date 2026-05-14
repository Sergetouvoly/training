// Refs: SPEC.md §9 — tous les endpoints Phase 1 + 2a + 2b + admin
import type { ApiClient } from "./client.js";
import type {
  LearningPath, Module, ProgressRecord,
  Passport, EvaluationItem, EvalAnswer, EvalResult,
  UpdateEvaluationItemDto, CsvImportResult,
  GdprExport, Notification, LearnerSummary, LearnerDetail,
  UserDto, CreateUserDto, UpdateUserDto, ResetPasswordDto,
  CompetenceDto, CreateCompetenceDto, UpdateCompetenceDto,
  AppConfigEntry,
  PermissionDto,
  RoleDto, RoleWithPermissionsDto, CreateRoleDto, UserRoleDto,
  TrashType, TrashListDto, PurgeExpiredResult,
  UserPermissionDto, UpsertUserPermissionDto,
  AssignmentDto, CreateAssignmentDto,
  TeamAggregate, TeamModuleProgress, AuditBundleExport,
} from "./types.js";

export function makeLearningApi(client: ApiClient) {
  return {
    publishModule: (id: string, signal?: AbortSignal) =>
      client.post<Module>(`/learning/modules/${id}/publish`, {}, signal),

    listPaths: (signal?: AbortSignal) =>
      client.get<LearningPath[]>("/learning/paths", signal),

    getPath: (id: string, signal?: AbortSignal) =>
      client.get<LearningPath>(`/learning/paths/${id}`, signal),

    deletePath: (id: string) =>
      client.delete<void>(`/learning/paths/${id}`),

    listModules: (signal?: AbortSignal) =>
      client.get<Module[]>("/learning/modules", signal),

    getModule: (id: string, signal?: AbortSignal) =>
      client.get<Module>(`/learning/modules/${id}`, signal),

    createModule: (dto: { title_fr: string; target_role?: string; competence_ids?: string[]; estimated_duration_minutes?: number }) =>
      client.post<Module>("/learning/modules", dto),

    updateModuleContent: (id: string, content_fr: unknown) =>
      client.patch<Module>(`/learning/modules/${id}/content`, { content_fr }),

    deleteModule: (id: string) =>
      client.delete<void>(`/learning/modules/${id}`),

    updateQuizConfig: (id: string, dto: {
      quiz_bank_id?: string | null;
      passing_score?: number;
      max_attempts?: number;
      cooldown_minutes?: number;
      show_explanations?: boolean;
    }) =>
      client.patch<Module>(`/learning/modules/${id}/quiz-config`, dto),

    createPath: (dto: { title_fr: string; target_role: string; module_sequence: string[]; is_mandatory: boolean }) =>
      client.post<LearningPath>("/learning/paths", dto),

    updatePath: (id: string, dto: Partial<{ title_fr: string; target_role: string; module_sequence: string[]; is_mandatory: boolean }>) =>
      client.patch<LearningPath>(`/learning/paths/${id}`, dto),

    saveProgress: (dto: { learner_id: string; module_id: string; module_version_hash: string; progress_percent: number }) =>
      client.post<ProgressRecord>("/learning/progress", dto),

    getProgress: (learnerId: string, signal?: AbortSignal) =>
      client.get<Record<string, number>>(`/learning/progress/${learnerId}`, signal),
  };
}

export function makeAssessmentApi(client: ApiClient) {
  return {
    listItems: (signal?: AbortSignal) =>
      client.get<EvaluationItem[]>("/assessment/items", signal),

    listByBank: (bankId: string, signal?: AbortSignal) =>
      client.get<EvaluationItem[]>(`/assessment/items/bank/${bankId}`, signal),

    createItem: (dto: {
      bank_id: string;
      format: "qcm_single" | "qcm_multi" | "true_false";
      difficulty: 1 | 2 | 3 | 4 | 5;
      bloom_level: 1 | 2 | 3 | 4 | 5 | 6;
      concept_tags: string[];
      content: { question_fr: string; question_en?: string; choices?: { label: string; is_correct: boolean }[]; correct_answer?: string };
    }) =>
      client.post<EvaluationItem>("/assessment/items", dto),

    updateItem: (id: string, dto: UpdateEvaluationItemDto) =>
      client.patch<EvaluationItem>(`/assessment/items/${id}`, dto),

    deleteItem: (id: string) =>
      client.delete<void>(`/assessment/items/${id}`),

    importCsv: (csv: string) =>
      client.post<CsvImportResult>("/assessment/items/import-csv", { csv }),

    importJson: (json: string) =>
      client.post<CsvImportResult>("/assessment/items/import-json", { json }),

    drawItems: (bankId: string, count = 10, signal?: AbortSignal) =>
      client.get<EvaluationItem[]>(`/assessment/items/draw?bank_id=${bankId}&count=${count}`, signal),

    evaluate: (dto: { learner_id: string; module_id: string; module_version_hash: string; answers: EvalAnswer[] }) =>
      client.post<EvalResult>("/assessment/evaluate", dto),
  };
}

export function makePassportApi(client: ApiClient) {
  return {
    get: (signal?: AbortSignal) =>
      client.get<Passport>("/simulator/passport", signal),

    export: (signal?: AbortSignal) =>
      client.get<object>("/simulator/passport/export", signal),
  };
}

export function makeUserApi(client: ApiClient) {
  return {
    getMe: (signal?: AbortSignal) =>
      client.get<{ id: string; mfa_enabled: boolean; email: string; display_name: string; app_role: string; platform_role?: string; team_id?: string | null }>("/users/me", signal),

    exportGdpr: (signal?: AbortSignal) =>
      client.get<GdprExport>("/users/me/export", signal),

    listLearners: (params?: { team_id?: string }, signal?: AbortSignal) => {
      const qs = params?.team_id ? `?team_id=${encodeURIComponent(params.team_id)}` : "";
      return client.get<LearnerSummary[]>(`/users/admin/learners${qs}`, signal);
    },

    getLearnerDetail: (learnerId: string, signal?: AbortSignal) =>
      client.get<LearnerDetail>(`/users/admin/learners/${learnerId}`, signal),

    updateMe: (dto: { display_name?: string; current_password?: string; new_password?: string }) =>
      client.patch<{ id: string; display_name: string; email: string }>("/users/me", dto),

    checkOnboarding: (signal?: AbortSignal) =>
      client.get<{ completed: boolean }>("/users/me/onboarding", signal),

    completeOnboarding: (job_role: string) =>
      client.post<void>("/users/me/onboarding/complete", { job_role }),
  };
}

export function makeAdminApi(client: ApiClient) {
  return {
    listUsers: (params?: { q?: string; role?: string; status?: "active" | "inactive" }, signal?: AbortSignal) => {
      const qs = new URLSearchParams();
      if (params?.q) qs.set("q", params.q);
      if (params?.role) qs.set("role", params.role);
      if (params?.status) qs.set("status", params.status);
      const query = qs.toString();
      return client.get<UserDto[]>(query ? `/users?${query}` : "/users", signal);
    },

    getUser: (id: string, signal?: AbortSignal) =>
      client.get<UserDto>(`/users/${id}`, signal),

    createUser: (dto: CreateUserDto) =>
      client.post<UserDto>("/users", dto),

    updateUser: (id: string, dto: UpdateUserDto) =>
      client.patch<UserDto>(`/users/${id}`, dto),

    deleteUser: (id: string) =>
      client.delete<void>(`/users/${id}`),

    resetPassword: (id: string, dto: ResetPasswordDto) =>
      client.patch<void>(`/users/${id}/password`, dto),

    getTokensUsed: (learnerId: string, signal?: AbortSignal) =>
      client.get<{ tokens_used_today: number }>(`/ai/tokens/${learnerId}`, signal),
  };
}

export function makeCompetenceApi(client: ApiClient) {
  return {
    list: (signal?: AbortSignal) =>
      client.get<CompetenceDto[]>("/competences", signal),

    getOne: (id: string, signal?: AbortSignal) =>
      client.get<CompetenceDto>(`/competences/${id}`, signal),

    create: (dto: CreateCompetenceDto) =>
      client.post<CompetenceDto>("/competences", dto),

    update: (id: string, dto: UpdateCompetenceDto) =>
      client.patch<CompetenceDto>(`/competences/${id}`, dto),

    remove: (id: string) =>
      client.delete<void>(`/competences/${id}`),
  };
}

export function makeTrashApi(client: ApiClient) {
  return {
    list: (type?: TrashType, signal?: AbortSignal) => {
      const url = type ? `/trash?type=${type}` : "/trash";
      return client.get<TrashListDto>(url, signal);
    },
    restore: (type: TrashType, id: string) =>
      client.post<unknown>(`/trash/${type}/${id}/restore`, {}),
    purgeOne: (type: TrashType, id: string) =>
      client.delete<void>(`/trash/${type}/${id}`),
    purgeExpired: () =>
      client.delete<PurgeExpiredResult>("/trash"),
  };
}

export function makeConfigApi(client: ApiClient) {
  return {
    list: (signal?: AbortSignal) =>
      client.get<AppConfigEntry[]>("/config", signal),

    set: (key: string, value: unknown) =>
      client.put<AppConfigEntry>(`/config/${key}`, { value }),
  };
}

export function makeNotificationApi(client: ApiClient) {
  return {
    list: (unreadOnly = false, signal?: AbortSignal) =>
      client.get<Notification[]>(`/social/notifications?unread_only=${unreadOnly}`, signal),

    markRead: () =>
      client.post<{ count: number }>("/social/notifications/mark-read", {}),
  };
}

export function makeUserPermissionApi(client: ApiClient) {
  return {
    list: (userId: string, signal?: AbortSignal) =>
      client.get<UserPermissionDto[]>(`/users/${userId}/permissions`, signal),

    upsert: (userId: string, code: string, dto: UpsertUserPermissionDto) =>
      client.put<UserPermissionDto>(`/users/${userId}/permissions/${encodeURIComponent(code)}`, dto),

    remove: (userId: string, code: string) =>
      client.delete<void>(`/users/${userId}/permissions/${encodeURIComponent(code)}`),
  };
}

export function makeAssignmentApi(client: ApiClient) {
  return {
    list: (params?: { assignee_id?: string; resource_type?: string }, signal?: AbortSignal) => {
      const qs = new URLSearchParams();
      if (params?.assignee_id) qs.set("assignee_id", params.assignee_id);
      if (params?.resource_type) qs.set("resource_type", params.resource_type);
      const query = qs.toString();
      return client.get<AssignmentDto[]>(query ? `/assignments?${query}` : "/assignments", signal);
    },

    listForAssignee: (assigneeId: string, signal?: AbortSignal) =>
      client.get<AssignmentDto[]>(`/assignments/assignee/${assigneeId}`, signal),

    create: (dto: CreateAssignmentDto) =>
      client.post<AssignmentDto>("/assignments", dto),

    remove: (id: string) =>
      client.delete<{ deleted: boolean }>(`/assignments/${id}`),
  };
}

export function makePermissionApi(client: ApiClient) {
  return {
    listAll: (signal?: AbortSignal) =>
      client.get<PermissionDto[]>("/permissions", signal),

    listAllGrants: (signal?: AbortSignal) =>
      client.get<Record<string, { permission_code: string; grants: { type: string; user: { id: string; display_name: string; email: string; app_role: string } }[] }>>("/permissions/grants", signal),
  };
}

export function makeRoleApi(client: ApiClient) {
  return {
    listAll: (signal?: AbortSignal) =>
      client.get<RoleDto[]>("/roles", signal),

    getOne: (id: string, signal?: AbortSignal) =>
      client.get<RoleWithPermissionsDto>(`/roles/${id}`, signal),

    create: (dto: CreateRoleDto) =>
      client.post<RoleDto>("/roles", dto),

    remove: (id: string) =>
      client.delete<void>(`/roles/${id}`),

    setPermissions: (id: string, permissions: string[]) =>
      client.put<void>(`/roles/${id}/permissions`, { permissions }),

    getUserRoles: (userId: string, signal?: AbortSignal) =>
      client.get<UserRoleDto[]>(`/users/${userId}/roles`, signal),

    grantRole: (userId: string, roleId: string) =>
      client.post<void>(`/users/${userId}/roles/${roleId}`, {}),

    revokeRole: (userId: string, roleId: string) =>
      client.delete<void>(`/users/${userId}/roles/${roleId}`),
  };
}

export function makeSimulatorApi(client: ApiClient) {
  return {
    getTeamAnalytics: (teamId: string, signal?: AbortSignal) =>
      client.get<TeamAggregate>(`/simulator/analytics/team?team_id=${encodeURIComponent(teamId)}`, signal),

    getTeamModuleProgress: (teamId: string, signal?: AbortSignal) =>
      client.get<TeamModuleProgress[]>(`/simulator/analytics/team/modules?team_id=${encodeURIComponent(teamId)}`, signal),
  };
}

export function makeAuditApi(client: ApiClient) {
  return {
    exportLearnerBundle: (learnerId: string, signal?: AbortSignal) =>
      client.get<AuditBundleExport>(`/audit/learners/${learnerId}/export`, signal),
  };
}

