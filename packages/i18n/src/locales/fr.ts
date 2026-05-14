// Refs: SPEC.md §8 — i18n obligatoire, zero hardcoded string
export const fr = {
  nav: {
    dashboard: "Tableau de bord",
    paths: "Mes parcours",
    profile: "Mon profil",
  },
  dashboard: {
    title: "Tableau de bord",
    welcome: "Bienvenue",
    myPaths: "Mes parcours",
    myStamps: "Mes compétences",
    progress: "Progression",
  },
  paths: {
    title: "Mes parcours",
    start: "Commencer",
    resume: "Reprendre",
    completed: "Terminé",
    mandatory: "Obligatoire",
  },
  parcours: {
    searchPlaceholder: "Rechercher un parcours…",
    filterRole: "Filtrer par rôle",
    filterStatus: "Filtrer par statut",
    allRoles: "Tous les rôles",
    allStatuses: "Tous les statuts",
  },
  modules: {
    catalogueTitle: "Catalogue de modules",
    searchPlaceholder: "Rechercher un module…",
    filterCompetence: "Filtrer par compétence",
    allCompetences: "Toutes les compétences",
    filterStatus: "Filtrer par statut",
    allStatuses: "Tous les statuts",
    noModulesFound: "Aucun module trouvé",
    adjustFilters: "Modifiez vos filtres",
  },
  module: {
    title: "Module",
    next: "Suivant",
    previous: "Précédent",
    complete: "Terminer le module",
  },
  eval: {
    title: "Évaluation",
    question: "Question",
    of: "sur",
    submit: "Valider",
    next: "Question suivante",
    finish: "Terminer l'évaluation",
  },
  profile: {
    title: "Mon profil",
    competences: "Mes compétences validées",
    stamps: "Tampons",
    export: "Exporter mes données (RGPD)",
    valid: "Valide",
    expiring: "Bientôt expiré",
    expired: "Expiré",
    downloadCertificate: "Télécharger le certificat",
    downloadCertificateAriaLabel: "Télécharger le certificat PDF pour",
  },
  audit: {
    exportBundle: "Exporter le dossier d'audit",
    exportBundleDesc: "JSON signé (R-4.3)",
    downloadCertificate: "Télécharger le certificat",
  },
  onboarding: {
    title: "Bienvenue sur Holenek LMS !",
    step1Title: "Quel est votre métier ?",
    step2Title: "Vos parcours de formation",
    step3Title: "Prêt à commencer ?",
    dismiss: "Je verrai plus tard",
    complete: "Commencer",
  },
  assignments: {
    overdue: "En retard",
    dueDate: "Échéance",
    dueOn: "Dû le",
    overdueSince: "En retard depuis le",
    createAssignment: "Assigner une formation",
    resourceType: "Type de ressource",
    resource: "Ressource",
    dueDateOptional: "Date d'échéance (optionnel)",
    alreadyAssigned: "Cette formation est déjà assignée",
    assignSuccess: "Formation assignée avec succès",
  },
  login: {
    title: "Connexion",
    email: "Adresse e-mail",
    password: "Mot de passe",
    mfa: "Code MFA (si activé)",
    submit: "Se connecter",
    error: "Identifiants invalides ou code MFA incorrect",
  },
  common: {
    loading: "Chargement…",
    error: "Une erreur est survenue",
    retry: "Réessayer",
    back: "Retour",
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
  },
} as const;

// Messages est le type structurel (record de strings), pas les literal types
export type Messages = {
  [K in keyof typeof fr]: {
    [J in keyof (typeof fr)[K]]: string;
  };
};
