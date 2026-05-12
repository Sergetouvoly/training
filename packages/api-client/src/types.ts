// Refs: SPEC-CONTENT.md §2 — types canoniques du système de contenu riche

// ── Inline content (texte enrichi dans les blocs) ───────────────────────────

export type InlineMark = "bold" | "italic" | "underline" | "code" | "highlight" | "strike" | "textStyle";

export type InlineTextAttrs = {
  color?: string;
  fontFamily?: string;
  highlightColor?: string;
};

export type InlineContent =
  | { type: "text"; text: string; marks?: InlineMark[]; attrs?: InlineTextAttrs }
  | { type: "link"; href: string; text: string; external?: boolean };

// ── Blocs de contenu ─────────────────────────────────────────────────────────

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  content: InlineContent[];
  textAlign?: "left" | "center" | "right" | "justify";
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 2 | 3 | 4;
  content: InlineContent[];
  textAlign?: "left" | "center" | "right" | "justify";
}

export interface BulletListBlock {
  id: string;
  type: "bullet_list";
  items: InlineContent[][];
}

export interface OrderedListBlock {
  id: string;
  type: "ordered_list";
  items: InlineContent[][];
}

export interface BlockquoteBlock {
  id: string;
  type: "blockquote";
  content: InlineContent[];
}

export interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  alt: string;
  caption?: string;
  width?: number | "full" | "wide" | "inline";
  align?: "left" | "center" | "right";
}

export interface AudioBlock {
  id: string;
  type: "audio";
  url: string;
  title: string;
  duration_seconds?: number;
}

export interface VideoEmbedBlock {
  id: string;
  type: "video_embed";
  provider: "youtube" | "vimeo";
  video_id: string;
  caption?: string;
}

export interface VideoBlock {
  id: string;
  type: "video";
  url: string;
  title: string;
  caption?: string;
  mime?: string;
}

export interface FileBlock {
  id: string;
  type: "file";
  url: string;
  filename: string;
  size_bytes?: number;
  mime?: string;
}

export interface CalloutBlock {
  id: string;
  type: "callout";
  variant: "info" | "warning" | "danger" | "success" | "tip";
  title?: string;
  content: InlineContent[];
}

export interface CodeBlock {
  id: string;
  type: "code";
  language: string;
  code: string;
  filename?: string;
}

export interface TableBlock {
  id: string;
  type: "table";
  headers: string[];
  rows: string[][];
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

export interface ScenarioBlock {
  id: string;
  type: "scenario";
  title: string;
  context: string;
  events: string[];
  lessons: string[];
}

export interface KeyTakeawayBlock {
  id: string;
  type: "key_takeaway";
  points: string[];
}

export interface MiniQuizBlock {
  id: string;
  type: "mini_quiz";
  question: string;
  choices: { label: string; is_correct: boolean }[];
  explanation: string;
}

export type Block =
  | ParagraphBlock
  | HeadingBlock
  | BulletListBlock
  | OrderedListBlock
  | BlockquoteBlock
  | ImageBlock
  | AudioBlock
  | VideoBlock
  | VideoEmbedBlock
  | FileBlock
  | CalloutBlock
  | CodeBlock
  | TableBlock
  | DividerBlock
  | ScenarioBlock
  | KeyTakeawayBlock
  | MiniQuizBlock;

// ── Structure d'une leçon ────────────────────────────────────────────────────

export interface Lesson {
  id: string;
  title_fr: string;
  blocks: Block[];
}

// ── Contenu complet d'un module ──────────────────────────────────────────────

export interface ModuleContent {
  lessons: Lesson[];
  audio_summary_url?: string;
  quiz_unlock_condition: "all_lessons_read";
  estimated_duration_minutes: number;
  lesson_unlock_mode?: "free" | "sequential";
}

// ── Entités principales ───────────────────────────────────────────────────────

export interface LearningPath {
  id: string;
  tenant_id: string;
  title_fr: string;
  target_role: "hr" | "developer" | "manager" | "finance" | "all";
  module_sequence: string[];
  is_mandatory: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  tenant_id: string;
  version: string;
  version_hash: string;
  title_fr: string;
  status: "draft" | "published";
  competence_ids: string[];
  content_fr: ModuleContent | null;
  estimated_duration_minutes: number | null;
  created_at: string;
}

export interface ProgressRecord {
  id: string;
  tenant_id: string;
  learner_id: string;
  module_id: string;
  progress_percent: number;
  updated_at: string;
}

export interface Stamp {
  id: string;
  competence_id: string;
  state: "green" | "orange" | "red";
  validated_at: string;
  expires_at: string;
  performance_score: number;
  attempts: number;
}

export interface PassportStamp extends Stamp {
  competence: {
    id: string;
    code: string;
    label_fr: string;
    label_en: string;
  };
}

export interface Streak {
  current_days: number;
  longest_days: number;
  last_activity_date: string | null;
}

export interface Passport {
  learner_id: string;
  tenant_id: string;
  stamps: PassportStamp[];
  streak: Streak;
}

export interface EvaluationItem {
  id: string;
  bank_id: string;
  format: "qcm_single" | "qcm_multi" | "true_false";
  difficulty: number;
  bloom_level: number;
  concept_tags: string[];
  content: {
    question_fr: string;
    question_en?: string;
    choices?: { label: string; is_correct: boolean }[];
    correct_answer?: string;
    explanation_fr?: string;
  };
}

export interface UpdateEvaluationItemDto {
  difficulty?: 1 | 2 | 3 | 4 | 5;
  bloom_level?: 1 | 2 | 3 | 4 | 5 | 6;
  concept_tags?: string[];
  content?: {
    question_fr: string;
    question_en?: string;
    choices?: { label: string; is_correct: boolean }[];
    correct_answer?: string;
  };
}

export interface CsvImportResult {
  imported: number;
  errors: string[];
}

export interface EvalAnswer {
  item_id: string;
  answer: string | string[];
}

export interface EvalResult {
  stamp_id: string;
  stamp_state: "green" | "orange" | "red";
  performance_score: number;
  competence_id: string;
}

export interface GdprExport {
  exported_at: string;
  learner: {
    id: string;
    email: string;
    display_name: string;
    primary_role: string;
    created_at: string;
  };
  stamps: Stamp[];
  events: { event_id: string; event_name: string; occurred_at: string; payload: unknown }[];
}

export interface Notification {
  id: string;
  type: string;
  payload: unknown;
  read: boolean;
  created_at: string;
}

export interface LearnerSummary {
  id: string;
  email: string;
  display_name: string;
  primary_role: string;
  team_id: string | null;
  created_at: string;
  stamp_count: number;
  green_count: number;
  orange_count: number;
  red_count: number;
}

export interface LearnerDetail extends LearnerSummary {
  stamps: {
    id: string;
    state: string;
    validated_at: string;
    expires_at: string;
    performance_score: number;
    attempts: number;
    competence_code: string;
    competence_label_fr: string;
  }[];
  progress: {
    module_id: string;
    progress_percent: number;
    updated_at: string;
  }[];
}

// ── Admin — Users ─────────────────────────────────────────────────────────────

export type PlatformRole = "super_admin" | "admin" | "trainer" | "manager" | "learner";
export type JobRole = "hr" | "developer" | "manager" | "finance";

export interface UserDto {
  id: string;
  email: string;
  display_name: string;
  platform_role: PlatformRole;
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  job_role: JobRole | null;
  team_id: string | null;
}

export interface CreateUserDto {
  email: string;
  display_name: string;
  platform_role: PlatformRole;
  password: string;
  job_role?: JobRole;
  team_id?: string;
}

export interface UpdateUserDto {
  display_name?: string;
  platform_role?: PlatformRole;
  is_active?: boolean;
  job_role?: JobRole | null;
  team_id?: string | null;
}

export interface ResetPasswordDto {
  password: string;
}

// ── Admin — Competences ───────────────────────────────────────────────────────

export interface CompetenceDto {
  id: string;
  code: string;
  label_fr: string;
  label_en: string;
  created_at: string;
}

export interface CreateCompetenceDto {
  code: string;
  label_fr: string;
  label_en: string;
}

export interface UpdateCompetenceDto {
  code?: string;
  label_fr?: string;
  label_en?: string;
}

// ── Admin — AppConfig ─────────────────────────────────────────────────────────

export interface AppConfigEntry {
  key: string;
  value: unknown;
  updated_at: string;
}
