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
