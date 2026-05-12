import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// Refs: SPEC.md §9 US-2a.6 — Debrief déterministe post-évaluation
// R-2a.3 : Orange → suggestion remise à niveau, Rouge → reparcours requis
// R-3.1 : Pas de LLM — 100% basé sur les règles métier

export interface DebriefItem {
  competence_code: string;
  competence_label: string;
  performance_score: number;
  attempts: number;
  advice: string;
}

@Injectable()
export class DebriefService {
  constructor(private readonly prisma: PrismaService) {}

  async generateDebrief(learnerId: string) {
    const stamps = await this.prisma.stamp.findMany({
      where: { learner_id: learnerId },
      include: { competence: { select: { code: true, label_fr: true } } },
      orderBy: { validated_at: "desc" },
    });

    const strengths: DebriefItem[] = [];
    const toReview: DebriefItem[] = [];
    const toRedo: DebriefItem[] = [];

    for (const s of stamps) {
      const item: DebriefItem = {
        competence_code: s.competence.code,
        competence_label: s.competence.label_fr,
        performance_score: s.performance_score,
        attempts: s.attempts,
        advice: "",
      };

      if (s.state === "green") {
        item.advice = `Compétence validée (${s.performance_score}%). Continuez ainsi !`;
        strengths.push(item);
      } else if (s.state === "orange") {
        // R-2a.3 : Orange → remise à niveau suggérée
        item.advice = `Remise à niveau suggérée. Score actuel : ${s.performance_score}%. Un module de révision est recommandé.`;
        toReview.push(item);
      } else {
        // R-2a.3 : Rouge → reparcours requis
        item.advice = `Reparcours requis. Score : ${s.performance_score}% (tentative ${s.attempts}). Ce parcours doit être refait intégralement.`;
        toRedo.push(item);
      }
    }

    return {
      learner_id: learnerId,
      generated_at: new Date().toISOString(),
      strengths,
      to_review: toReview,
      to_redo: toRedo,
      overall_advice: buildOverallAdvice(strengths.length, toReview.length, toRedo.length),
    };
  }
}

function buildOverallAdvice(green: number, orange: number, red: number): string {
  if (green === 0 && orange === 0 && red === 0) {
    return "Aucune évaluation complétée. Commencez votre premier parcours !";
  }
  if (red > 0) {
    return `${red} compétence(s) nécessite(nt) un reparcours complet. Priorité absolue.`;
  }
  if (orange > 0) {
    return `${orange} compétence(s) à consolider. Révisez les modules concernés.`;
  }
  return `Excellente maîtrise sur ${green} compétence(s) validée(s). Continuez !`;
}
