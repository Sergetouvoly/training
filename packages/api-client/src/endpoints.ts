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
      client.get<{ id: string; mfa_enabled: boolean; email: string; display_name: string; platform_role: string }>("/users/me", signal),

    exportGdpr: (signal?: AbortSignal) =>
      client.get<GdprExport>("/users/me/export", signal),

    listLearners: (signal?: AbortSignal) =>
      client.get<LearnerSummary[]>("/users/admin/learners", signal),

    getLearnerDetail: (learnerId: string, signal?: AbortSignal) =>
      client.get<LearnerDetail>(`/users/admin/learners/${learnerId}`, signal),
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
