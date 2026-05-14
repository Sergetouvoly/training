import { PERMISSIONS, SYSTEM_ROLE_CODES, type Permission } from "@elearning/domain";

export const SYSTEM_ROLES = [
  { appRole: "super_admin", code: SYSTEM_ROLE_CODES.super_admin, label_fr: "Super administrateur", label_en: "Super admin" },
  { appRole: "admin", code: SYSTEM_ROLE_CODES.admin, label_fr: "Administrateur", label_en: "Admin" },
  { appRole: "trainer", code: SYSTEM_ROLE_CODES.trainer, label_fr: "Formateur", label_en: "Trainer" },
  { appRole: "manager", code: SYSTEM_ROLE_CODES.manager, label_fr: "Manager", label_en: "Manager" },
  { appRole: "learner", code: SYSTEM_ROLE_CODES.learner, label_fr: "Apprenant", label_en: "Learner" },
] as const;

export const ROLE_PERMISSIONS: Record<keyof typeof SYSTEM_ROLE_CODES, readonly Permission[]> = {
  super_admin: PERMISSIONS,
  admin: [
    // Actions
    "user.read", "user.create", "user.update", "user.delete", "user.reset_password",
    "learner.read", "learner.read_detail",
    "competence.read", "competence.create", "competence.update", "competence.delete",
    "module.read", "module.create", "module.update", "module.publish", "module.upload_media", "module.delete",
    "learning_path.read", "learning_path.create", "learning_path.update", "learning_path.delete",
    "evaluation_item.read", "evaluation_item.create", "evaluation_item.update", "evaluation_item.delete", "evaluation_item.import_csv",
    "stamp.read_any", "mastery.check_expire",
    "analytics.team_read",
    "app_config.read", "app_config.write", "ai.index_document", "audit.read",
    "certificate.download", "audit.export",
    "notification.send", "scheduler.manage",
    "role.read", "role.assign",
    "trash.read", "trash.restore",
    // Assignation — admin : acces total, cross-team inclus, peut montrer l'assignant
    "assignment.create", "assignment.read", "assignment.delete",
    "assignment.read_cross_team", "assignment.show_assigner",
    // Vues
    "view.admin",
    "view.admin_users", "view.admin_learners", "view.admin_modules", "view.admin_paths",
    "view.admin_competences", "view.admin_assessment", "view.admin_roles", "view.admin_trash",
    "view.admin_config",
    "view.trainer_space", "view.manager_space",
    "view.learner_dashboard", "view.learner_parcours", "view.learner_modules",
    "view.learner_eval", "view.learner_profil", "view.learner_notifications",
  ],
  trainer: [
    // Actions
    "learner.read", "learner.read_detail", "competence.read",
    "module.read", "module.create", "module.update", "module.publish", "module.upload_media",
    "learning_path.read",
    "evaluation_item.read", "evaluation_item.create", "evaluation_item.update", "evaluation_item.delete", "evaluation_item.import_csv",
    "certificate.download",
    // Assignation — trainer : scope tous apprenants par defaut (cross_team via grant individuel)
    "assignment.create", "assignment.read", "assignment.delete",
    // Vues
    "view.admin",
    "view.admin_learners", "view.admin_modules", "view.admin_paths", "view.admin_assessment",
    "view.trainer_space",
    "view.learner_dashboard", "view.learner_parcours", "view.learner_modules",
    "view.learner_eval", "view.learner_profil", "view.learner_notifications",
  ],
  manager: [
    // Actions
    "learner.read", "learner.read_detail", "competence.read", "module.read", "learning_path.read",
    "scenario.create_video_node", "challenge.create", "challenge.close", "analytics.team_read",
    "certificate.download",
    // Assignation — manager : lecture seule de son equipe par defaut
    // assignment.create + assignment.delete via grant individuel si besoin
    "assignment.read",
    // Vues
    "view.admin",
    "view.admin_learners",
    "view.manager_space",
    "view.learner_dashboard", "view.learner_parcours", "view.learner_modules",
    "view.learner_eval", "view.learner_profil", "view.learner_notifications",
  ],
  learner: [
    // Actions
    "module.read", "learning_path.read",
    "certificate.download",
    // Vues
    "view.learner_dashboard", "view.learner_parcours", "view.learner_modules",
    "view.learner_eval", "view.learner_profil", "view.learner_notifications",
  ],
};
