// Refs: SPEC.md §9 US-2b.5 — templates email notif (nodemailer SMTP)

export const emailTemplates = {
  moduleAssigned(learnerName: string, resourceTitle: string, platformUrl: string) {
    return {
      subject: `Nouvelle formation assignée : ${resourceTitle}`,
      html: `<p>Bonjour ${learnerName},</p>
<p>Une nouvelle formation vous a été assignée : <strong>${resourceTitle}</strong>.</p>
<p><a href="${platformUrl}/parcours">Accéder à ma formation</a></p>
<p>— L'équipe Holenek LMS</p>`,
    };
  },

  assignmentDueReminder(learnerName: string, resourceTitle: string, dueDate: string, platformUrl: string) {
    return {
      subject: `Rappel : "${resourceTitle}" est dû le ${dueDate}`,
      html: `<p>Bonjour ${learnerName},</p>
<p>Votre formation <strong>${resourceTitle}</strong> est due le <strong>${dueDate}</strong>.</p>
<p><a href="${platformUrl}/parcours">Reprendre ma formation</a></p>
<p>— L'équipe Holenek LMS</p>`,
    };
  },

  stampExpiring(learnerName: string, competenceLabel: string, expiresAt: string, platformUrl: string) {
    return {
      subject: `Votre certification "${competenceLabel}" expire bientôt`,
      html: `<p>Bonjour ${learnerName},</p>
<p>Votre certification <strong>${competenceLabel}</strong> expire le <strong>${expiresAt}</strong>.</p>
<p>Pensez à renouveler votre certification pour rester conforme.</p>
<p><a href="${platformUrl}/profil">Voir mon passeport</a></p>
<p>— L'équipe Holenek LMS</p>`,
    };
  },
};
