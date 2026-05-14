export { createApiClient, ApiError } from "./client.js";
export type { ApiClient, ApiClientConfig } from "./client.js";
export {
  makeLearningApi, makeAssessmentApi, makePassportApi,
  makeUserApi, makeAdminApi, makeCompetenceApi, makeConfigApi,
  makeNotificationApi, makeRoleApi, makeTrashApi, makeUserPermissionApi, makePermissionApi,
  makeAssignmentApi, makeSimulatorApi, makeAuditApi,
} from "./endpoints.js";
export type {
  // Entités apprentissage
  LearningPath, Module, ModuleContent, ModuleQuizConfig, Lesson,
  ProgressRecord, Passport, PassportStamp, Streak,
  EvaluationItem, EvalAnswer, EvalResult,
  GdprExport, Notification,
  LearnerSummary, LearnerDetail,
  // Admin
  PlatformRole, JobRole,
  UserDto, CreateUserDto, UpdateUserDto,
  CompetenceDto, CreateCompetenceDto, UpdateCompetenceDto,
  AppConfigEntry,
  PermissionDto,
  RoleDto, RoleWithPermissionsDto, CreateRoleDto, UserRoleDto,
  UserPermissionDto, UpsertUserPermissionDto,
  AssignmentDto, CreateAssignmentDto,
  TeamAggregate, TeamModuleProgress, AuditBundleExport,
  TrashType, TrashedItem, TrashListDto, PurgeExpiredResult,
  // Blocs de contenu
  Block, InlineContent, InlineMark,
  ParagraphBlock, HeadingBlock, BulletListBlock, OrderedListBlock, BlockquoteBlock,
  ImageBlock, AudioBlock, VideoBlock, VideoEmbedBlock, FileBlock,
  CalloutBlock, CodeBlock, TableBlock, DividerBlock,
  ScenarioBlock, KeyTakeawayBlock, MiniQuizBlock, ShapeBlock, ShapeType,
} from "./types.js";
