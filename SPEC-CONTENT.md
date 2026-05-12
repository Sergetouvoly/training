# SPEC-CONTENT.md — Système de contenu riche des modules

> Complément de SPEC.md §5 et §9. S'applique à partir de Phase 1 (contenu) + Phase 2a (media).
> Toute implémentation doit citer ce document : `Refs: SPEC-CONTENT.md §x.y`

---

## 1. Philosophie : ce que font les géants, adapté à Holenek

### Ce qu'on observe sur OpenClassrooms, Coursera, Teachable, Notion

| Plateforme | Modèle de contenu | Éditeur | Média |
|---|---|---|---|
| OpenClassrooms | Page longue scrollable, blocs typés | WYSIWYG custom | Image, vidéo, code, quiz inline |
| Coursera | Vidéo centrale + texte + quiz après | Upload vidéo | Vidéo HD, transcription, PDF |
| Teachable | TipTap/Quill WYSIWYG | Éditeur riche | Image, vidéo embed, PDF |
| Notion | Blocs typés drag-drop | `/commandes` inline | Image, audio, embed, code |

### Ce qu'on retient pour Holenek

Un **module** = une séquence de **leçons**. Une **leçon** = une page longue qui scrolle naturellement, composée de **blocs** typés. L'apprenant avance leçon par leçon (Précédent / Suivant). Le quiz débarre après toutes les leçons lues.

L'éditeur admin produit du **JSON structuré** (format TipTap) stocké dans `content_fr`. Le rendu apprenant consomme ce JSON et le transforme en HTML sécurisé.

---

## 2. Structure de données du contenu

### 2.1 Hiérarchie

```
Module
└── content_fr: ModuleContent
    ├── lessons: Lesson[]           ← remplace "sections"
    ├── audio_summary_url?: string  ← résumé audio du module entier
    ├── quiz_unlock_condition: "all_lessons_read"
    └── estimated_duration_minutes: number
```

```
Lesson
├── id: string
├── title_fr: string
├── blocks: Block[]                 ← contenu riche
└── mini_quiz?: MiniQuiz            ← quiz intercalé optionnel (Phase 2a)
```

### 2.2 Catalogue des blocs (Block)

Chaque bloc a un `type` et des propriétés spécifiques. Format compatible TipTap/ProseMirror.

#### Blocs texte

| Type | Propriétés | Rendu |
|---|---|---|
| `paragraph` | `content: InlineContent[]` | `<p>` avec gras, italique, liens |
| `heading` | `level: 1\|2\|3`, `content: InlineContent[]` | `<h2>` `<h3>` `<h4>` |
| `bullet_list` | `items: InlineContent[][]` | `<ul><li>` |
| `ordered_list` | `items: InlineContent[][]` | `<ol><li>` |
| `blockquote` | `content: InlineContent[]` | `<blockquote>` stylé |

#### Blocs media

| Type | Propriétés | Rendu |
|---|---|---|
| `image` | `url: string`, `alt: string`, `caption?: string`, `width?: "full"\|"wide"\|"inline"` | `<figure><img>` lazy |
| `audio` | `url: string`, `title: string`, `duration_seconds: number` | Player audio natif |
| `video_embed` | `provider: "youtube"\|"vimeo"`, `video_id: string`, `caption?: string` | iframe sandboxé |
| `file` | `url: string`, `filename: string`, `size_bytes: number`, `mime: string` | Lien téléchargement |

#### Blocs pédagogiques

| Type | Propriétés | Rendu |
|---|---|---|
| `callout` | `variant: "info"\|"warning"\|"danger"\|"success"\|"tip"`, `title?: string`, `content: InlineContent[]` | Encadré coloré avec icône |
| `code` | `language: string`, `code: string`, `filename?: string` | Bloc code avec coloration syntaxique |
| `table` | `headers: string[]`, `rows: string[][]` | `<table>` responsive |
| `divider` | — | `<hr>` séparateur visuel |
| `scenario` | `title: string`, `context: string`, `events: ScenarioEvent[]`, `lessons: string[]` | Carte scénario structurée |

#### Blocs engagement (Phase 2a)

| Type | Propriétés | Rendu |
|---|---|---|
| `mini_quiz` | `question: string`, `choices: Choice[]`, `explanation: string` | QCM inline dans la leçon |
| `key_takeaway` | `points: string[]` | Encadré "À retenir" en fin de leçon |

### 2.3 InlineContent (contenu inline dans les blocs texte)

```typescript
type InlineContent =
  | { type: "text"; text: string; marks?: Mark[] }
  | { type: "link"; href: string; text: string; external?: boolean }

type Mark = "bold" | "italic" | "underline" | "code" | "highlight"
```

### 2.4 Type TypeScript complet

```typescript
interface ModuleContent {
  lessons: Lesson[];
  audio_summary_url?: string;
  quiz_unlock_condition: "all_lessons_read";
  estimated_duration_minutes: number;
}

interface Lesson {
  id: string;
  title_fr: string;
  blocks: Block[];
}

type Block =
  | ParagraphBlock | HeadingBlock | BulletListBlock | OrderedListBlock | BlockquoteBlock
  | ImageBlock | AudioBlock | VideoEmbedBlock | FileBlock
  | CalloutBlock | CodeBlock | TableBlock | DividerBlock | ScenarioBlock
  | MiniQuizBlock | KeyTakeawayBlock

interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  alt: string;
  caption?: string;
  width?: "full" | "wide" | "inline";
}

interface AudioBlock {
  id: string;
  type: "audio";
  url: string;
  title: string;
  duration_seconds: number;
}

interface CalloutBlock {
  id: string;
  type: "callout";
  variant: "info" | "warning" | "danger" | "success" | "tip";
  title?: string;
  content: InlineContent[];
}

// ... (autres blocs idem)
```

---

## 3. Stockage des media

### 3.1 Stratégie par phase

**Phase 1 (MVP)** — URL externe uniquement
- L'admin colle une URL publique (image hébergée ailleurs, YouTube, etc.)
- Zéro upload, zéro S3, zéro complexité infra
- Validation : URL accessible, Content-Type image/* ou audio/*

**Phase 2a** — Upload local avec stockage fichiers
- Endpoint `POST /media/upload` → stocke dans `uploads/` local (dev) ou S3 (prod)
- Retourne une URL signée temporaire ou une URL publique selon la configuration
- Chaque fichier scopé `tenant_id` : `/{tenant_id}/{module_id}/{uuid}.{ext}`
- Taille max : image 10 MB, audio 100 MB, PDF 50 MB
- ADR requis avant implémentation S3

**Phase 3** — CDN + optimisation
- Resize images côté serveur (sharp), formats WebP/AVIF
- Audio transcription automatique (accessibilité)
- Streaming vidéo si hébergement propre

### 3.2 Règles de sécurité media

- Toute URL media dans un bloc doit appartenir au tenant ou être une URL externe validée
- Pas d'upload de fichiers exécutables (.js, .exe, .sh, .php, etc.)
- Les iframes video_embed sont sandboxées : `sandbox="allow-scripts allow-same-origin"`
- Alt text obligatoire sur toutes les images (WCAG AA §1.1.1)

---

## 4. Éditeur admin (AuthoringTool)

### 4.1 Principe

L'éditeur est basé sur **TipTap** (extension de ProseMirror). C'est le standard utilisé par Notion, Linear, Pitch. Il produit du JSON structuré.

L'admin voit le rendu WYSIWYG en temps réel — pas de split markdown/preview.

### 4.2 Fonctionnalités de l'éditeur

**Barre de blocs (palette `/` ou bouton `+`)**
```
Texte
  ├── Paragraphe         (défaut)
  ├── Titre 2
  ├── Titre 3
  ├── Liste à puces
  ├── Liste numérotée
  └── Citation

Média
  ├── Image              (URL ou upload Phase 2a)
  ├── Audio              (URL ou upload Phase 2a)
  ├── Vidéo YouTube/Vimeo
  └── Fichier PDF

Pédagogie
  ├── Encadré Info       (callout info)
  ├── Encadré Attention  (callout warning)
  ├── Encadré Danger     (callout danger)
  ├── Bloc de code       (avec sélection langage)
  ├── Tableau
  ├── Scénario
  ├── Mini-quiz          (Phase 2a)
  └── Points clés à retenir
```

**Barre d'outils inline (sélection de texte)**
- Gras, Italique, Souligné, Code inline
- Lien (URL + texte + option ouvrir dans un nouvel onglet)
- Surlignage

**Gestion des leçons**
- Liste des leçons dans un panneau latéral
- Ajouter / renommer / supprimer / réordonner par drag-drop
- Durée estimée par leçon (calculée automatiquement sur temps de lecture)

**Résumé audio du module**
- Champ dédié en haut : URL ou upload d'un fichier audio
- Affiché dans la sidebar apprenant comme "Écouter le résumé"

### 4.3 Workflow de publication

```
[Brouillon] → [Prévisualisation] → [Publié]
```

- Brouillon : visible admin uniquement, non accessible aux apprenants
- Prévisualisation : l'admin peut voir le rendu exact apprenant via un lien `/preview/module/:id`
- Publié : accessible aux apprenants — bump de `version` et recalcul `version_hash`

---

## 5. Rendu apprenant (ModuleReader)

### 5.1 Layout général

```
┌─────────────────────────────────────────────┐
│  SIDEBAR (sticky, 240px)                    │
│  ├── Titre module                           │
│  ├── Barre progression                      │
│  ├── [▶ Écouter le résumé]  ← audio module  │
│  ├── Liste leçons (✓ lues / ► en cours)    │
│  └── [Passer le quiz]                       │
├─────────────────────────────────────────────┤
│  CONTENU LEÇON (scrollable)                 │
│  ├── Titre leçon                            │
│  ├── Blocs typés (scrolle naturellement)    │
│  └── [← Précédent] [Leçon suivante →]       │
└─────────────────────────────────────────────┘
```

### 5.2 Rendu de chaque type de bloc

**`paragraph` / `heading`** — HTML standard avec styles typographiques Holenek
**`image`** — `<figure>` avec lazy-loading, alt obligatoire, caption en `<figcaption>`
**`audio`** — Player natif HTML5 avec contrôles, titre affiché
**`video_embed`** — iframe YouTube/Vimeo responsive (ratio 16:9) sandboxée
**`callout`** — Encadré avec icône + couleur selon variant (info=bleu, warning=orange, danger=rouge, success=vert, tip=teal)
**`code`** — Bloc `<pre><code>` avec coloration syntaxique (highlight.js ou Shiki), bouton "Copier"
**`table`** — `<table>` responsive avec scroll horizontal sur mobile
**`scenario`** — Carte structurée : contexte → déroulement → leçons apprises
**`mini_quiz`** — QCM inline, réponse immédiate avec explication (ne compte pas dans le score final)
**`key_takeaway`** — Encadré "À retenir" avec liste de points, visuellement distinct
**`file`** — Bouton téléchargement avec nom de fichier et taille

### 5.3 Lecteur audio résumé

Dans la sidebar :
- Bouton "▶ Écouter le résumé" (si `audio_summary_url` défini)
- Au clic : player audio compact inline dans la sidebar
- Contrôles : play/pause, barre de progression, vitesse (0.75x / 1x / 1.25x / 1.5x)
- Ne bloque pas la navigation entre leçons

### 5.4 Progression et déverrouillage quiz

- Une leçon est "lue" quand l'apprenant clique "Leçon suivante" ou scrolle jusqu'au bas
- Le quiz se déverrouille quand toutes les leçons sont lues (`quiz_unlock_condition: "all_lessons_read"`)
- Les mini-quiz inline ne débloquent pas le quiz final — ce sont des exercices d'engagement

---

## 6. Interface admin complète

### 6.1 Pages livrées (Phase 1)

| Route | Description | Rôles autorisés |
|---|---|---|
| `/admin` | Dashboard : stats, utilisateurs récents, modules récents | super_admin, admin |
| `/admin/users` | Liste + recherche/filtres tous utilisateurs | super_admin, admin |
| `/admin/users/new` | Créer un compte utilisateur | super_admin, admin |
| `/admin/users/:id` | Éditer, reset password, désactiver, supprimer | super_admin, admin |
| `/admin/modules` | Liste tous les modules | super_admin, admin, trainer |
| `/admin/modules/new` | Créer un nouveau module | super_admin, admin, trainer |
| `/admin/modules/:id` | Éditer le contenu (AuthoringTool) | super_admin, admin, trainer |
| `/admin/paths` | Liste les parcours | super_admin, admin, trainer |
| `/admin/paths/new` | Créer un parcours | super_admin, admin, trainer |
| `/admin/paths/:id` | Éditer un parcours | super_admin, admin, trainer |
| `/admin/competences` | Référentiel de compétences | super_admin, admin |
| `/admin/competences/:id` | Éditer/supprimer une compétence | super_admin, admin |
| `/admin/assessment` | Banque de questions (liste, créer, import CSV) | super_admin, admin, trainer |
| `/admin/learners` | Liste apprenants avec stamps | super_admin, admin |
| `/admin/learners/:id` | Détail apprenant (progression + passeport) | super_admin, admin |
| `/admin/config` | Paramètres système (LLM, budgets tokens) | super_admin uniquement |
| `/trainer` | Dashboard formateur | super_admin, admin, trainer |
| `/trainer/learners` | Liste apprenants du formateur | super_admin, admin, trainer |
| `/trainer/learners/:id` | Détail apprenant (espace formateur) | super_admin, admin, trainer |
| `/manager` | Dashboard manager (métriques équipe) | super_admin, admin, manager |
| `/manager/learners/:id` | Détail membre équipe | super_admin, admin, manager |

### 6.2 Création d'un module (workflow admin)

```
1. /admin/modules/new
   ├── Titre du module
   ├── Rôle cible (hr / developer / manager / finance / all)
   ├── Compétences ciblées (sélection multi)
   └── Durée estimée (auto-calculée après)

2. /admin/modules/:id → AuthoringTool
   ├── Panneau gauche : liste des leçons
   ├── Zone centrale : éditeur WYSIWYG
   ├── Panneau droit : propriétés du bloc sélectionné
   └── Barre en haut : Brouillon / Prévisualiser / Publier

3. Prévisualisation : /preview/module/:id
   └── Rendu exact apprenant, sans tracking progression
```

---

## 7. Règles non-négociables (rails)

### 7.1 Accessibilité (WCAG AA — CI gate)

- Toute image doit avoir un attribut `alt` non vide — validé à la sauvegarde
- Les players audio/vidéo doivent avoir des contrôles natifs accessibles
- Les blocs code doivent avoir `aria-label="Bloc de code [langage]"`
- Contraste couleur des callouts : vérifié contre WCAG AA (ratio ≥ 4.5:1)

### 7.2 Sécurité

- Zéro `dangerouslySetInnerHTML` sur du contenu JSON admin non validé
- Tout contenu HTML rendu passe par un sanitizer (DOMPurify côté client, ou rendu serveur avec liste blanche de tags)
- Les URLs des media sont validées : schéma `https://` uniquement, domaine non blacklisté
- Les embeds video sont iframés avec `sandbox` strict

### 7.3 Performance

- Images : lazy-loading natif (`loading="lazy"`) + dimensions explicites (évite CLS)
- Audio/Vidéo : pas de preload automatique (`preload="none"`)
- Blocs code : highlight.js chargé en dynamic import (pas dans le bundle principal)
- Lighthouse ≥ 85 sur les routes `/parcours/*/module/*` (CI gate, SPEC.md §8)

### 7.4 Isolation tenant

- Chaque asset media est scopé `/{tenant_id}/...` dans le stockage
- Impossible d'accéder à un media d'un autre tenant même avec l'URL directe (middleware de vérification)
- Le contenu JSON d'un module appartient strictement à son tenant_id

### 7.5 Traçabilité (SPEC.md §6.4)

- Toute publication d'un module (`status: draft → published`) :
  1. Calcule `version_hash = SHA-256(JSON.stringify(content_fr))`
  2. Bumpe `version` (semver mineur si contenu, majeur si structure)
  3. Émet l'événement `ModulePublished` (à ajouter au catalogue DOMAIN §4)
- L'éditeur brouillon n'affecte pas `version_hash` — seule la publication le fait

---

## 8. Décisions d'architecture (ADR à créer)

### ADR-CONTENT-001 : TipTap comme moteur d'édition

**Décision** : Utiliser TipTap (ProseMirror) comme éditeur WYSIWYG.
**Raison** : Standard de facto 2024-2025, utilisé par Notion/Linear/Pitch. JSON natif, extensible avec des nœuds custom, SSR-compatible, licence MIT.
**Alternative rejetée** : Quill (abandonné), CKEditor (lourd, licence payante), Slate (instable).

### ADR-CONTENT-002 : Stockage media Phase 1 — URL externe seulement

**Décision** : Phase 1 = URL externe uniquement. Pas d'upload fichier.
**Raison** : Simplifie l'infra Phase 1. L'admin héberge ses images sur Cloudinary/Imgur/Drive et colle l'URL. Zéro S3, zéro presigned URL, zéro edge cases CORS.
**Évolution** : Phase 2a = endpoint upload local → S3 (ADR séparé requis avec choix provider).

### ADR-CONTENT-003 : JSON TipTap dans content_fr (Prisma Json)

**Décision** : `content_fr` reste un champ `Json` Prisma. Le schéma TipTap est validé à l'application, pas en base.
**Raison** : Flexibilité des évolutions de schéma de blocs sans migration Prisma à chaque nouveau type de bloc.
**Contrepartie** : Validation Zod stricte au niveau API avant tout PATCH sur content_fr.

---

## 9. Plan d'implémentation

### Sprints 1–3 — LIVRÉS (Phase 1)
- Types TypeScript Block/Lesson/ModuleContent dans @elearning/api-client ✓
- AuthoringTool TipTap : paragraph, heading, bullet_list, callout, code, image, divider ✓
- Gestion multi-leçons dans l'éditeur ✓
- Toutes les pages admin §6.1 livrées ✓
- CRUD utilisateurs complet (création, édition, reset password, désactivation, suppression) ✓
- Banque questions : liste, création, import CSV ✓
- Isolation rôles : guards frontend par espace + RolesGuard backend ✓

### Sprint 4 — À livrer (Phase 2a)
1. Endpoint `POST /media/upload` (local d'abord, puis S3 — ADR requis)
2. Workflow brouillon / publié avec version_hash + événement ModulePublished
3. Mini-quiz inline (`mini_quiz` block)
4. Drag-drop réordonnancement des leçons
5. Validation TOTP MFA (speakeasy) — US-1.1 restant

---

## 10. Critères de validation

- [x] Un admin peut créer un module avec des leçons contenant image, callout, code en moins de 10 minutes
- [ ] Un apprenant peut écouter le résumé audio depuis la sidebar sans quitter sa leçon (Phase 2a)
- [ ] Les mini-quiz inline donnent un retour immédiat sans affecter le score final (Phase 2a)
- [ ] Lighthouse ≥ 85 sur `/parcours/*/module/*` avec une leçon contenant 3 images
- [ ] axe-core AA : zéro violation sur une leçon avec image, audio, code et tableau
- [ ] Un module avec 10 leçons charge en < 300ms P95
- [ ] Un trainer ne peut pas accéder aux routes /admin/users ni /admin/config
- [ ] Un manager ne peut pas accéder aux routes /admin/** (redirigé /dashboard)
