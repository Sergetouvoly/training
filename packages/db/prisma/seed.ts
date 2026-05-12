// Refs: SPEC.md §6 — donnees de dev reproductibles, mono-organisation Holenek
// Usage : pnpm --filter @elearning/db db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const HASH = (pwd: string) => bcrypt.hashSync(pwd, 10);

// ── Contenu Module 1 ─────────────────────────────────────
const MODULE1_CONTENT = {
  lessons: [
    {
      id: "lesson-intro",
      title_fr: "Pourquoi la cybersécurité nous concerne tous",
      blocks: [
        {
          id: "b1",
          type: "paragraph",
          content: [{ type: "text", text: "La porte d'entrée d'une cyberattaque, dans 9 cas sur 10, c'est un être humain — pas une machine." }],
        },
        {
          id: "b2",
          type: "callout",
          variant: "warning",
          title: "Quelques chiffres",
          content: [{ type: "text", text: "60 % des PME victimes d'une cyberattaque grave ferment dans les 18 mois." }],
        },
      ],
    },
    {
      id: "lesson-rgpd",
      title_fr: "RGPD : principes et obligations",
      blocks: [
        {
          id: "b3",
          type: "paragraph",
          content: [{ type: "text", text: "Le délai de notification à la CNIL en cas de violation de données est de 72 heures." }],
        },
      ],
    },
  ],
  quiz_unlock_condition: "all_lessons_read" as const,
  estimated_duration_minutes: 45,
};

async function main() {
  // ── Users (identite + role plateforme) ───────────────────
  await prisma.user.upsert({
    where: { email: "super@holenek.fr" },
    update: {},
    create: {
      email: "super@holenek.fr",
      password_hash: HASH("SuperAdmin1!"),
      display_name: "Super Admin",
      platform_role: "super_admin",
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@holenek.fr" },
    update: {},
    create: {
      email: "admin@holenek.fr",
      password_hash: HASH("Admin1234!"),
      display_name: "Admin Holenek",
      platform_role: "admin",
    },
  });

  const trainer = await prisma.user.upsert({
    where: { email: "formateur@holenek.fr" },
    update: {},
    create: {
      email: "formateur@holenek.fr",
      password_hash: HASH("Trainer1234!"),
      display_name: "Sophie Leblanc",
      platform_role: "trainer",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@holenek.fr" },
    update: {},
    create: {
      email: "manager@holenek.fr",
      password_hash: HASH("Manager1234!"),
      display_name: "Thomas Renard",
      platform_role: "manager",
    },
  });

  const alice = await prisma.user.upsert({
    where: { email: "alice@holenek.fr" },
    update: {},
    create: {
      email: "alice@holenek.fr",
      password_hash: HASH("Learner1234!"),
      display_name: "Alice Martin",
      platform_role: "learner",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@holenek.fr" },
    update: {},
    create: {
      email: "bob@holenek.fr",
      password_hash: HASH("Learner1234!"),
      display_name: "Bob Dupont",
      platform_role: "learner",
    },
  });

  // ── Learner profiles (1-to-1 avec User) ─────────────────
  // super_admin n'a pas de profil learner
  await prisma.learner.upsert({
    where: { user_id: admin.id },
    update: {},
    create: { user_id: admin.id, job_role: "manager", team_id: "direction" },
  });

  await prisma.learner.upsert({
    where: { user_id: trainer.id },
    update: {},
    create: { user_id: trainer.id, job_role: "hr", team_id: "formation" },
  });

  await prisma.learner.upsert({
    where: { user_id: manager.id },
    update: {},
    create: { user_id: manager.id, job_role: "manager", team_id: "pole-rh" },
  });

  const aliceLearner = await prisma.learner.upsert({
    where: { user_id: alice.id },
    update: {},
    create: { user_id: alice.id, job_role: "hr", team_id: "pole-rh" },
  });

  await prisma.learner.upsert({
    where: { user_id: bob.id },
    update: {},
    create: { user_id: bob.id, job_role: "developer", team_id: "pole-dev" },
  });

  // ── Competences ──────────────────────────────────────────
  const compRgpd = await prisma.competence.upsert({
    where: { code: "RGPD-001" },
    update: {},
    create: { code: "RGPD-001", label_fr: "Protection des données personnelles", label_en: "Personal data protection" },
  });

  const compSec = await prisma.competence.upsert({
    where: { code: "SEC-001" },
    update: {},
    create: { code: "SEC-001", label_fr: "Sécurité des systèmes d'information", label_en: "Information systems security" },
  });

  const compCrise = await prisma.competence.upsert({
    where: { code: "CRISE-001" },
    update: {},
    create: { code: "CRISE-001", label_fr: "Gestion de crise cyber", label_en: "Cyber crisis management" },
  });

  // ── Modules ───────────────────────────────────────────────
  const moduleCyber = await prisma.module.upsert({
    where: { id: "mod-cyber-rgpd-v1" },
    update: { content_fr: MODULE1_CONTENT },
    create: {
      id: "mod-cyber-rgpd-v1",
      version: "1.0.0",
      version_hash: "sha256-cyber-rgpd-v1-20260506",
      title_fr: "Cybersécurité & RGPD",
      status: "published",
      competence_ids: [compRgpd.id, compSec.id],
      content_fr: MODULE1_CONTENT,
      estimated_duration_minutes: 45,
    },
  });

  const moduleSec = await prisma.module.upsert({
    where: { id: "mod-sec-v1" },
    update: {},
    create: {
      id: "mod-sec-v1",
      version: "1.0.0",
      version_hash: "sha256-sec-v1-demo",
      title_fr: "Fondamentaux de la cybersécurité",
      status: "published",
      competence_ids: [compSec.id],
    },
  });

  await prisma.module.upsert({
    where: { id: "mod-crise-v1" },
    update: {},
    create: {
      id: "mod-crise-v1",
      version: "1.0.0",
      version_hash: "sha256-crise-v1-demo",
      title_fr: "Réponse à incident cyber",
      status: "draft",
      competence_ids: [compCrise.id],
    },
  });

  // ── Parcours ─────────────────────────────────────────────
  await prisma.learningPath.upsert({
    where: { id: "path-conformite-v1" },
    update: {},
    create: {
      id: "path-conformite-v1",
      title_fr: "Parcours Conformité & Sécurité",
      target_role: "all",
      module_sequence: [moduleCyber.id, moduleSec.id],
      is_mandatory: true,
    },
  });

  await prisma.learningPath.upsert({
    where: { id: "path-dev-v1" },
    update: {},
    create: {
      id: "path-dev-v1",
      title_fr: "Parcours Développeur Sécurisé",
      target_role: "developer",
      module_sequence: [moduleSec.id],
      is_mandatory: false,
    },
  });

  // ── Evaluation items ─────────────────────────────────────
  const quizItems = [
    {
      id: "item-cyber-q01",
      difficulty: 2,
      bloom_level: 3,
      concept_tags: ["phishing"],
      content: {
        question_fr: "Vous recevez un e-mail semblant provenir de votre banque. Quelle est la meilleure action ?",
        choices: [
          { label: "Cliquer sur le lien pour vérifier", is_correct: false },
          { label: "Appeler la banque via le numéro officiel", is_correct: true },
          { label: "Répondre à l'e-mail", is_correct: false },
          { label: "Ignorer", is_correct: false },
        ],
      },
    },
    {
      id: "item-cyber-q02",
      difficulty: 2,
      bloom_level: 1,
      concept_tags: ["rgpd", "cnil"],
      content: {
        question_fr: "Quel est le délai légal pour notifier la CNIL en cas de violation de données ?",
        choices: [
          { label: "24 heures", is_correct: false },
          { label: "72 heures", is_correct: true },
          { label: "7 jours", is_correct: false },
          { label: "30 jours", is_correct: false },
        ],
      },
    },
    {
      id: "item-cyber-q03",
      difficulty: 2,
      bloom_level: 3,
      concept_tags: ["securite", "cle-usb"],
      content: {
        question_fr: "Vous trouvez une clé USB dans le parking. Que faites-vous ?",
        choices: [
          { label: "La brancher pour identifier le propriétaire", is_correct: false },
          { label: "La remettre à l'IT sans la brancher", is_correct: true },
          { label: "La jeter", is_correct: false },
          { label: "La brancher sur un perso", is_correct: false },
        ],
      },
    },
  ];

  for (const item of quizItems) {
    await prisma.evaluationItem.upsert({
      where: { id: item.id },
      update: { content: item.content },
      create: {
        id: item.id,
        bank_id: moduleCyber.id,
        format: "qcm_single",
        difficulty: item.difficulty,
        bloom_level: item.bloom_level,
        concept_tags: item.concept_tags,
        content: item.content,
      },
    });
  }

  // ── Stamps demo pour Alice ────────────────────────────────
  const now = new Date();
  const expiresGreen = new Date(now);
  expiresGreen.setMonth(expiresGreen.getMonth() + 12);
  const expiresOrange = new Date(now);
  expiresOrange.setDate(expiresOrange.getDate() + 45);

  await prisma.stamp.upsert({
    where: { id: "stamp-alice-rgpd-v1" },
    update: {},
    create: {
      id: "stamp-alice-rgpd-v1",
      learner_id: aliceLearner.id,
      competence_id: compRgpd.id,
      state: "green",
      validated_at: now,
      expires_at: expiresGreen,
      module_version_hash: "sha256-cyber-rgpd-v1-20260506",
      performance_score: 88,
      attempts: 1,
    },
  });

  await prisma.stamp.upsert({
    where: { id: "stamp-alice-sec-v1" },
    update: {},
    create: {
      id: "stamp-alice-sec-v1",
      learner_id: aliceLearner.id,
      competence_id: compSec.id,
      state: "orange",
      validated_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 300),
      expires_at: expiresOrange,
      module_version_hash: "sha256-sec-v1-demo",
      performance_score: 72,
      attempts: 2,
    },
  });

  // ── Streak demo pour Alice ────────────────────────────────
  await prisma.streak.upsert({
    where: { learner_id: aliceLearner.id },
    update: {},
    create: {
      learner_id: aliceLearner.id,
      current_days: 5,
      longest_days: 12,
      last_activity_date: now,
    },
  });

  // ── AppConfig ─────────────────────────────────────────────
  await prisma.appConfig.upsert({
    where: { key: "stamp_validity_months" },
    update: {},
    create: { key: "stamp_validity_months", value: 12 },
  });

  await prisma.appConfig.upsert({
    where: { key: "mastery_window" },
    update: {},
    create: { key: "mastery_window", value: 3 },
  });

  console.log(`✓ 6 users (super_admin, admin, trainer, manager, alice, bob)`);
  console.log(`✓ 5 learner profiles (admin, trainer, manager, alice, bob)`);
  console.log(`✓ 3 competences`);
  console.log(`✓ 3 modules (2 published, 1 draft)`);
  console.log(`✓ 2 parcours`);
  console.log(`✓ 3 evaluation items`);
  console.log(`✓ 2 stamps + 1 streak pour alice`);
  console.log(`✓ 2 app_config entries`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
