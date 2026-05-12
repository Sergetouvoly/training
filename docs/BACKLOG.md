# Backlog — Back-office Holenek

Plan d'implémentation post-Phase 2a (MFA + draft/publish).
Lire avec CLAUDE.md (rails) et SPEC.md (oracle).

Dernière mise à jour : 2026-05-12.

---

## Audit — matrice rôles × surfaces (état au 2026-05-12)

| Surface | super_admin | admin | trainer | manager | learner |
|---|:-:|:-:|:-:|:-:|:-:|
| `/admin` Dashboard global | OK | OK | sidebar masquée | KO | KO |
| `/admin/users` CRUD comptes | OK | OK | KO | KO | KO |
| `/admin/users/:id` éditer rôle/statut | OK | OK | KO | KO | KO |
| `/admin/users/:id/password` reset MDP | OK | OK | KO | KO | KO |
| Désactiver MFA d'autrui | OK | KO | KO | KO | KO |
| `/admin/learners` liste apprenants | OK | OK | autorisé API, masqué UI | autorisé API, masqué UI | KO |
| `/admin/learners/:id` détail apprenant | OK | OK | autorisé API, masqué UI | autorisé API, masqué UI | KO |
| `/admin/modules` liste modules | OK | OK | OK | KO | KO |
| `/admin/modules/new` créer module | OK | OK | OK | KO | KO |
| `/admin/modules/:id` éditer contenu | OK | OK | OK | KO | KO |
| Publier un module | OK | OK | OK | KO | KO |
| Supprimer un module | OK | OK | KO | KO | KO |
| `/admin/paths` parcours | OK | OK | OK | KO | KO |
| `/admin/paths/:id` éditer parcours | OK | OK | KO (peut créer modules mais pas chaîner) | KO | KO |
| `/admin/competences` référentiel | OK | OK | KO | KO | KO |
| `/admin/assessment` banque questions | OK | OK | OK | KO | KO |
| `/admin/config` config plateforme | OK | KO | KO | KO | KO |

### Trous identifiés

1. Pas d'espace trainer dédié (`homeHref = "/trainer"` référencé dans le layout, route inexistante).
2. Pas d'espace manager dédié — rôle mort dans l'UI.
3. Plan d'audit RGPD absent côté admin (l'API expose `GET /users/me/export`, pas d'export pour autrui).
4. Pas de vue audit log — `audit.controller.ts` existe mais aucune page admin ne le lit.
5. Pas de gestion des équipes — `team_id` existe sur `UserDto`, jamais éditable.
6. Pas de bouton "réinitialiser le MFA" sur la fiche user (super_admin only).
7. Verrouillage séquentiel des leçons absent.
8. `ModuleContent.quiz_unlock_condition` codé en dur, pas paramétrable UI.
9. Pas de prévisualisation différentielle brouillon vs version publiée.
10. Pas de versioning visible (les `version_hash` existent en base, pas d'historique, pas de rollback).
11. Pas de système de notifications/messaging admin → apprenants.
12. Pas de mapping module ↔ bank de questions visible côté admin.

---

## Principes directeurs

- Pas de migration breaking : tous les ajouts à `ModuleContent` sont optionnels avec default safe.
- Source de vérité = matrice rôles ci-dessus. UI et API doivent être alignées (aucune page admin accessible qui retourne 403 côté API).
- Une seule décision = une seule fonction : `can(role, action)` plutôt qu'éparpiller `if (role === "admin")` partout.
- CLAUDE.md §6 reste actif : chaque ajout DB-touchant ships avec `it_does_not_leak_across_tenants`.

---

## Phase 2a-bis — Stabilisation reader + verrouillage leçons (≈ 1 j)

Boucher les fuites courantes avant d'ajouter de la surface. Le crash audio bloque la preview, donc P0.

### A. Guards défensifs reader (P0)

- `ModuleReader.tsx` cas `audio`/`video`/`video_embed`/`file` : si URL/ID vide → placeholder "Média non configuré" au lieu de `<source src="">`.
- Idem dans l'éditeur preview admin.

### B. Verrouillage séquentiel des leçons

- Type : ajout `lesson_unlock_mode?: "free" | "sequential"` dans `ModuleContent` (default `"free"`).
- Admin (`AdminModuleEditor.tsx`) : toggle dans la barre d'actions, à côté de "Durée estimée".
- Reader (`ModuleReader.tsx`) :
  - `isLocked(i) = mode === "sequential" && i > 0 && !readLessons.has(i-1)`.
  - Sidebar item verrouillé : cadenas + click no-op + opacity 50.
  - `goTo(i)` refuse `isLocked(i)`.
  - Bouton "Module suivant" reste actif (auto-débloque). Option `requires_explicit_completion` plus tard.
- Aucun changement API/DB : `content_fr` est un JSON opaque côté serveur.

### C. Quiz final — vérification end-to-end

- Vérifier le mapping `evaluation_items` ↔ module en DB.
- Vérifier `/api/assessment/evaluate` reçoit les bons paramètres.
- Si bug réel : test reproducteur avant fix (rail §1 CLAUDE.md).

### D. Cohérence audio/video

- Même garde-fou dans les blocs callout/file et tout endroit qui rend un `<source>` ou `<iframe>`.

**Sortie** : 1 PR. Tests : reader avec média vide, mode séquentiel, quiz E2E.

---

## Phase 2b — Permissions unifiées + accès trainer/manager (≈ 2 j)

Aligner UI ↔ API et combler les rôles morts.

### A. Couche d'autorisation centralisée

- `apps/web/lib/permissions.ts` :

```ts
export type Action =
  | "user.read" | "user.create" | "user.update" | "user.delete"
  | "user.reset_password" | "user.disable_mfa"
  | "learner.read" | "learner.read_detail"
  | "module.read" | "module.create" | "module.update" | "module.delete" | "module.publish"
  | "path.read" | "path.create" | "path.update" | "path.delete"
  | "competence.read" | "competence.write"
  | "assessment.read" | "assessment.write"
  | "config.read" | "config.write"
  | "audit.read";
export function can(role: PlatformRole, action: Action): boolean { … }
```

- Côté API : un `permissions.ts` jumeau pour le décorateur `@Permissions("module.publish")` (remplace progressivement `@Roles(…)`).
- Test : chaque action testée pour les 5 rôles, snapshot 5×N booléens.

### B. Espace trainer `/trainer`

- `apps/web/app/(app)/trainer/page.tsx` : dashboard restreint = modules + parcours + questions + apprenants (lecture).
- `homeHref` du AdminSidebar pointe correctement.
- La sidebar admin reste accessible à trainer mais filtre via `can()`.

### C. Espace manager `/manager`

- Dashboard équipe : ses apprenants, leur progression, leurs stamps.
- Lecture seule.

### D. Correction asymétrie API ↔ UI

- `/admin/learners` accessible à trainer + manager via la sidebar (déjà autorisé côté API).
- Boutons "Éditer module" masqués pour manager même si l'URL est devinable (guard layout).

**Sortie** : 1 PR. Tests : matrice rôles × routes (table de tests paramétrée).

---

## Phase 2c — Module config avancée + paramétrage du quiz (≈ 2 j)

Donner à l'admin la maîtrise complète de la pédagogie sans toucher au code.

### A. Configuration par module (étend `ModuleContent`)

- `lesson_unlock_mode: "free" | "sequential"` (cf. 2a-bis).
- `completion_mode: "auto" | "explicit_button"` : terminé en cliquant "Suivant" ou en cochant explicitement.
- `quiz_unlock_threshold: number` (0–100) : % de progression nécessaire pour débloquer le quiz (default 100).
- `passing_score: number` (default 70).
- `max_attempts?: number` : limite de tentatives quiz (default null = illimité).
- `cooldown_minutes_between_attempts?: number`.
- `randomize_question_order?: boolean`.
- `show_explanations: "always" | "after_quiz" | "never"`.

### B. UI admin — panneau "Réglages pédagogiques"

- Collapsible dans la barre du haut de `AdminModuleEditor`, à côté de "Durée estimée".
- Tout est optionnel, defaults = valeurs courantes du SPEC.

### C. Banque de questions ↔ module

- Aujourd'hui les `evaluation_items` ont un `bank_id`. Lier un module à un (ou plusieurs) `bank_id` explicitement, sélecteur dans l'éditeur module.
- Affichage : "X questions disponibles dans la banque liée".

### D. Reader applique tous ces réglages

- Tentatives, score, cooldown, randomize → state local + API `/assessment/evaluate` reçoit les contraintes pour validation serveur.

**Rails CLAUDE.md** : §6.4 audit — chaque nouvelle valeur de config qui affecte la certification (passing_score, max_attempts) change le `version_hash`.

**Sortie** : 1 PR + ADR court (`docs/adr/ADR-0004-module-config-extended.md`) car ça touche `ModuleContent` → contrat partagé.

---

## Phase 2d — Manager, équipes, learner-detail enrichi (≈ 2 j)

### A. Modèle équipe

- `team_id` existe déjà sur `User`. Ajouter `Team` (id, tenant_id, name, manager_id).
- API : `/teams` CRUD super_admin/admin.
- Admin UI : `/admin/teams` (création, assignation manager, ajout/retrait apprenants).
- Sur la fiche user : sélecteur d'équipe.

### B. Espace manager utile

- `/manager` : tableau de bord équipe — taux de validation par compétence, apprenants en retard, à risque.
- `/manager/learners/:id` : détail (lecture seule).

### C. Apprenant détail (admin) — actions

- Forcer la révision d'un stamp (reset à "orange").
- Réinitialiser une tentative de quiz.
- Réassigner un parcours.
- Toujours avec entrée audit log + event domain (`StampManuallyResetByAdmin`).

**Sortie** : 1 PR + migration Prisma (`Team`).

---

## Phase 2e — Audit log, versioning, RGPD (≈ 2 j)

### A. Page `/admin/audit` (admin + super_admin)

- Liste paginée des `AuditEntry` (filtre par user, action, date).
- Détail = JSON payload + hash SHA-256.
- Search / filter.

### B. Historique des versions module

- `/admin/modules/:id/versions` : liste des `version_hash` publiés avec date + diff visuel (texte) entre 2 versions.
- Bouton "Restaurer cette version" → crée un nouveau brouillon à partir de l'ancienne version (pas de mutation des publications).

### C. RGPD admin

- Bouton "Exporter les données de cet apprenant" sur la fiche apprenant (zip JSON, déjà disponible côté API en self-service — on l'ouvre à super_admin pour autrui).
- Bouton "Anonymiser" : remplace email/display_name par un hash, conserve les stamps anonymisés.

**Sortie** : 1 PR. Tests d'audit hash inchangé après mutations.

---

## Phase 2f — Notifications, communication, hygiène (≈ 2 j)

### A. Notifications admin → apprenant

- Reuse de la table `Notification` existante.
- UI admin : "envoyer un message à cet apprenant / cette équipe".
- Apprenant : cloche existante (présumée).

### B. Annonces globales (super_admin)

- Bannière configurable (texte + sévérité) → affichée à tous jusqu'à dismiss.

### C. Hygiène / fonctionnalités d'admin

- Bouton "Forcer un nouveau MFA setup" sur fiche user.
- Bouton "Voir les sessions actives" (cookies/JWT) + révocation.
- Logs de connexion (déjà dans audit si présents).

**Sortie** : 1 PR.

---

## Phase 2g — IA bornée + simulateur (≈ 3 j, dépendant)

Rails CLAUDE.md §6.3 — l'IA recommande, ne génère pas librement.

### A. Réglages IA par module

- Choix de la bank de questions disponibles pour le simulateur.
- Token budget par learner par jour (déjà global, l'ouvrir par module).
- Activer/désactiver le simulateur sur ce module.

### B. UI admin RAG sources

- Liste des documents indexés (par module).
- Upload PDF / lien → indexation (job async).
- Suppression d'un document = re-index.

### C. Logs IA

- Page admin : voir les requêtes (anonymisées), tokens consommés, taux de citation.

**Sortie** : 1 PR. Dépend du moteur IA déjà en place — à valider.

---

## Récapitulatif livrables

| Phase | Surface ajoutée / corrigée | Effort | Dépendances |
|---|---|---|---|
| 2a-bis | Audio guard + verrouillage leçons + quiz E2E | 1 j | aucune |
| 2b | `can()` + `/trainer` + `/manager` | 2 j | aucune |
| 2c | Config module étendue + bank↔module | 2 j | 2b |
| 2d | Équipes + manager utile + actions apprenant | 2 j | 2b |
| 2e | Audit, versioning, RGPD admin | 2 j | 2b |
| 2f | Notifications + hygiène compte | 2 j | 2b |
| 2g | IA / RAG admin | 3 j | 2c |

Total : ~14 j pour un back-office complet, audit-ready, conforme CLAUDE.md.

---

## Prochain pas recommandé

Démarrer **Phase 2a-bis** en priorité :
1. Le crash audio bloque la preview → bloque tout le reste.
2. Le verrouillage leçons est une demande utilisateur explicite.
3. Pas de dépendance, pas de migration DB.
4. PR isolée, mergeable rapidement.
