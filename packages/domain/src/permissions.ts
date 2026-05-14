/**
 * Catalogue de permissions granulaires — source de verite cote code.
 * Refs: SPEC.md §5 §7 — RBAC dynamique. Le mapping role→permissions vit en BDD,
 * mais les identifiants sont fixes ici pour eviter les strings magiques dans les
 * controllers, services et guards.
 *
 * Convention de nommage : "<resource>.<verb>". Pas de suffixes :self/:any —
 * la logique self vs other vit dans les services (cf. SPEC.md §5 et CLAUDE.md §6.1).
 */

export const PERMISSIONS = [
  // ─── User ────────────────────────────────────────────────
  "user.read",
  "user.create",
  "user.update",
  "user.delete",
  "user.reset_password",
  "user.disable_mfa_other",      // desactiver le MFA d'un AUTRE utilisateur
  "user.manage_permissions",     // attribuer/revoquer des permissions directes sur un user

  // ─── Learner (vue admin / formateur / manager) ───────────
  "learner.read",         // liste
  "learner.read_detail",  // detail (stamps, progression)

  // ─── Competence ──────────────────────────────────────────
  "competence.read",
  "competence.create",
  "competence.update",
  "competence.delete",

  // ─── Module ──────────────────────────────────────────────
  "module.read",
  "module.create",
  "module.update",
  "module.delete",
  "module.publish",
  "module.upload_media",

  // ─── LearningPath ────────────────────────────────────────
  "learning_path.read",
  "learning_path.create",
  "learning_path.update",
  "learning_path.delete",

  // ─── EvaluationItem (banque de questions) ────────────────
  "evaluation_item.read",
  "evaluation_item.create",
  "evaluation_item.update",
  "evaluation_item.delete",
  "evaluation_item.import_csv",

  // ─── Assignment ──────────────────────────────────────────
  "assignment.create",            // assigner un module ou parcours a un apprenant
  "assignment.read",              // voir les assignations (scope propre equipe par defaut)
  "assignment.delete",            // retirer une assignation
  "assignment.read_cross_team",   // voir et agir sur les assignations hors de sa propre equipe
  "assignment.show_assigner",     // rendre visible a l'apprenant le nom de l'assignant

  // ─── Stamp / Mastery ─────────────────────────────────────
  "stamp.read_any",       // lire les stamps de n'importe quel apprenant
  "mastery.check_expire", // declenche le check d'expiration cote admin

  // ─── Scenario ────────────────────────────────────────────
  "scenario.create_video_node",

  // ─── Social / Challenge ──────────────────────────────────
  "challenge.create",
  "challenge.close",

  // ─── Analytics ───────────────────────────────────────────
  "analytics.team_read",

  // ─── AppConfig ───────────────────────────────────────────
  "app_config.read",
  "app_config.write",

  // ─── AI ──────────────────────────────────────────────────
  "ai.index_document",

  // ─── Audit ───────────────────────────────────────────────
  "audit.read",

  // ─── Role administration (UI /admin/roles — futur) ───────
  "role.read",
  "role.create",
  "role.update",
  "role.delete",
  "role.assign",
  "role.update_permissions",

  // ─── Certificats & Audit ─────────────────────────────────
  "certificate.download", // telecharger un certificat PDF de competence
  "audit.export",         // exporter le dossier d'audit JSON d'un apprenant (R-4.3)

  // ─── Notifications ───────────────────────────────────────
  "notification.send",    // broadcast notification a un ou plusieurs apprenants

  // ─── Planificateur (cron) ────────────────────────────────
  "scheduler.manage",     // activer/desactiver les taches cron via app_config

  // ─── Corbeille ───────────────────────────────────────────
  "trash.read",    // voir la corbeille
  "trash.restore", // restaurer un element
  "trash.purge",   // supprimer definitivement + configurer la retention

  // ─── Vues (acces aux routes frontend) ────────────────────
  // Convention : view.<espace> ou view.<espace>_<sous-page>.
  // La permission parente (ex. view.admin) est TOUJOURS necessaire en plus
  // de la permission specifique (ex. view.admin_users).

  // Espace admin (parent obligatoire)
  "view.admin",              // /admin et tout l'espace admin
  "view.admin_users",        // /admin/users, /admin/users/new, /admin/users/:id
  "view.admin_learners",     // /admin/learners, /admin/learners/:id
  "view.admin_modules",      // /admin/modules, /admin/modules/new, /admin/modules/:id
  "view.admin_paths",        // /admin/paths, /admin/paths/new, /admin/paths/:id
  "view.admin_competences",  // /admin/competences, /admin/competences/:id
  "view.admin_assessment",   // /admin/assessment
  "view.admin_roles",        // /admin/roles, /admin/roles/:id
  "view.admin_trash",        // /admin/trash
  "view.admin_config",       // /admin/config

  // Espace formateur
  "view.trainer_space",      // /trainer, /trainer/learners, /trainer/learners/:id

  // Espace manager
  "view.manager_space",      // /manager, /manager/learners/:id

  // Espace apprenant (accessible a tous les roles authentifies concernes)
  "view.learner_dashboard",    // /dashboard
  "view.learner_parcours",     // /parcours, /parcours/:pathId, /parcours/:pathId/:moduleId
  "view.learner_modules",      // /module (catalogue)
  "view.learner_eval",         // /eval
  "view.learner_profil",       // /profil
  "view.learner_notifications",// /notifications
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSIONS_SET: ReadonlySet<Permission> = new Set(PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSIONS_SET.has(value as Permission);
}

/**
 * Decompose une permission "resource.verb" en ses parties.
 * Utile cote service pour persister/inserer en BDD.
 */
export function splitPermission(code: Permission): { resource: string; verb: string } {
  const idx = code.indexOf(".");
  return { resource: code.slice(0, idx), verb: code.slice(idx + 1) };
}

/**
 * Codes des roles systeme. Les codes sont stables et utilises pour relier
 * un user a son role via le seed et la migration de bascule.
 */
export const SYSTEM_ROLE_CODES = {
  super_admin: "role_super_admin",
  admin: "role_admin",
  trainer: "role_trainer",
  manager: "role_manager",
  learner: "role_learner",
} as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[keyof typeof SYSTEM_ROLE_CODES];
