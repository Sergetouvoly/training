export { createApiClient, ApiError } from "./client.js";
export type { ApiClient, ApiClientConfig } from "./client.js";
export {
  makeLearningApi, makeAssessmentApi, makePassportApi,
  makeUserApi, makeAdminApi, makeCompetenceApi, makeConfigApi,
  makeNotificationApi,
} from "./endpoints.js";
export type {
  // Entités apprentissage
  LearningPath, Module, ModuleContent, Lesson,
  ProgressRecord, Passport, PassportStamp, Streak,
  EvaluationItem, EvalAnswer, EvalResult,
  GdprExport, Notification,
  LearnerSummary, LearnerDetail,
  // Admin
  PlatformRole, JobRole,
  UserDto, CreateUserDto, UpdateUserDto,
  CompetenceDto, CreateCompetenceDto, UpdateCompetenceDto,
  AppConfigEntry,
  // Blocs de contenu
  Block, InlineContent, InlineMark,
  ParagraphBlock, HeadingBlock, BulletListBlock, OrderedListBlock, BlockquoteBlock,
  ImageBlock, AudioBlock, VideoEmbedBlock, FileBlock,
  CalloutBlock, CodeBlock, TableBlock, DividerBlock,
  ScenarioBlock, KeyTakeawayBlock, MiniQuizBlock,
} from "./types.js";
