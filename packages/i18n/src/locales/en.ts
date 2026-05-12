// Refs: SPEC.md §8 — i18n obligatoire, zero hardcoded string
import type { Messages } from "./fr";

export const en: Messages = {
  nav: {
    dashboard: "Dashboard",
    paths: "My paths",
    profile: "My profile",
  },
  dashboard: {
    title: "Dashboard",
    welcome: "Welcome",
    myPaths: "My paths",
    myStamps: "My competences",
    progress: "Progress",
  },
  paths: {
    title: "My paths",
    start: "Start",
    resume: "Resume",
    completed: "Completed",
    mandatory: "Mandatory",
  },
  module: {
    title: "Module",
    next: "Next",
    previous: "Previous",
    complete: "Complete module",
  },
  eval: {
    title: "Assessment",
    question: "Question",
    of: "of",
    submit: "Submit",
    next: "Next question",
    finish: "Finish assessment",
  },
  profile: {
    title: "My profile",
    competences: "My validated competences",
    stamps: "Stamps",
    export: "Export my data (GDPR)",
    valid: "Valid",
    expiring: "Expiring soon",
    expired: "Expired",
  },
  login: {
    title: "Sign in",
    email: "Email address",
    password: "Password",
    mfa: "MFA code (if enabled)",
    submit: "Sign in",
    error: "Invalid credentials or MFA code",
  },
  common: {
    loading: "Loading…",
    error: "An error occurred",
    retry: "Retry",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
  },
};
