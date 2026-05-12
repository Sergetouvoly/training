// Refs: SPEC.md §7 — autorisations centralisées par rôle plateforme.
// Cette table est la source de vérité côté web. Elle DOIT rester alignée
// avec les décorateurs @Roles(...) côté API. Voir aussi docs/BACKLOG.md §2b.
//
// Règle d'or : si un bouton/lien est visible dans l'UI, l'API doit l'autoriser.
// Inversement : si l'API l'autorise, on peut le proposer dans l'UI.

import type { PlatformRole } from "@elearning/api-client";

// ── Catalogue d'actions ─────────────────────────────────────────────────────
// Format : "<resource>.<verb>". Évite la prolifération en passant par
// l'objet manipulé. Ajouter une action ici impose d'ajouter sa règle dans
// PERMISSIONS plus bas, sinon TypeScript râle.

export type Action =
  // Utilisateurs (cf. user.controller.ts)
  | "user.read"
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.reset_password"
  | "user.disable_mfa"          // super_admin seul peut désactiver le MFA d'autrui
  // Apprenants
  | "learner.read"              // liste
  | "learner.read_detail"       // détail
  // Modules de formation
  | "module.read"
  | "module.create"
  | "module.update"
  | "module.delete"
  | "module.publish"
  // Parcours
  | "path.read"
  | "path.create"
  | "path.update"
  | "path.delete"
  // Compétences
  | "competence.read"
  | "competence.write"
  // Banque de questions
  | "assessment.read"
  | "assessment.write"
  // Configuration plateforme
  | "config.read"
  | "config.write"
  // Audit log (Phase 2e)
  | "audit.read";

// ── Table d'autorisations ───────────────────────────────────────────────────
// Chaque action liste les rôles autorisés. Dérivée des @Roles(...) côté API.

const PERMISSIONS: Record<Action, ReadonlyArray<PlatformRole>> = {
  // Utilisateurs
  "user.read":              ["super_admin", "admin"],
  "user.create":            ["super_admin", "admin"],
  "user.update":            ["super_admin", "admin"],
  "user.delete":            ["super_admin", "admin"],
  "user.reset_password":    ["super_admin", "admin"],
  "user.disable_mfa":       ["super_admin"],

  // Apprenants : API ouvre à trainer + manager, alignons-nous
  "learner.read":           ["super_admin", "admin", "trainer", "manager"],
  "learner.read_detail":    ["super_admin", "admin", "trainer", "manager"],

  // Modules : trainer peut créer/éditer/publier ; suppression réservée admin
  "module.read":            ["super_admin", "admin", "trainer", "manager", "learner"],
  "module.create":          ["super_admin", "admin", "trainer"],
  "module.update":          ["super_admin", "admin", "trainer"],
  "module.delete":          ["super_admin", "admin"],
  "module.publish":         ["super_admin", "admin", "trainer"],

  // Parcours : trainer NE peut PAS éditer (cf. learning.controller.ts:36)
  "path.read":              ["super_admin", "admin", "trainer", "manager", "learner"],
  "path.create":            ["super_admin", "admin"],
  "path.update":            ["super_admin", "admin"],
  "path.delete":            ["super_admin", "admin"],

  // Compétences : admin uniquement (référentiel sensible)
  "competence.read":        ["super_admin", "admin", "trainer", "manager"],
  "competence.write":       ["super_admin", "admin"],

  // Banque de questions : trainer peut créer/éditer
  "assessment.read":        ["super_admin", "admin", "trainer"],
  "assessment.write":       ["super_admin", "admin", "trainer"],

  // Config plateforme : super_admin uniquement pour écrire
  "config.read":            ["super_admin", "admin"],
  "config.write":           ["super_admin"],

  // Audit : ouvert à admin pour traçabilité
  "audit.read":             ["super_admin", "admin"],
};

// ── API publique ─────────────────────────────────────────────────────────────

/**
 * Vérifie si un rôle peut effectuer une action.
 * Retourne false si role est vide/inconnu (fail-closed).
 */
export function can(role: PlatformRole | string | undefined, action: Action): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[action];
  return allowed.includes(role as PlatformRole);
}

/**
 * Helper inverse : "ce rôle a accès à AU MOINS UNE des actions listées".
 * Pratique pour afficher une section de menu si au moins une page est lisible.
 */
export function canAny(role: PlatformRole | string | undefined, actions: ReadonlyArray<Action>): boolean {
  return actions.some((a) => can(role, a));
}

// ── Helpers haut-niveau ─────────────────────────────────────────────────────
// Évitent de répéter `can(role, "x") || can(role, "y")` dans les pages.

/** Peut accéder à l'espace admin (au moins une action admin) ? */
export function canAccessAdmin(role: PlatformRole | string | undefined): boolean {
  return canAny(role, [
    "user.read", "learner.read", "module.update", "path.update",
    "competence.read", "assessment.read", "config.read",
  ]);
}

/** Peut accéder à l'espace trainer (édition de contenu) ? */
export function canAccessTrainerSpace(role: PlatformRole | string | undefined): boolean {
  return canAny(role, ["module.update", "assessment.write"]);
}

/** Peut accéder à l'espace manager (lecture équipe) ? */
export function canAccessManagerSpace(role: PlatformRole | string | undefined): boolean {
  return role === "manager" || role === "super_admin" || role === "admin";
}
