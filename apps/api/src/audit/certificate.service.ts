import { Injectable } from "@nestjs/common";
import type { AuditProofBundle } from "@elearning/crypto";

/**
 * Generates a PDF certificate buffer.
 * Refs: SPEC.md R-1.5, WORKFLOW.md §6 BLOC 6
 */

export interface CertificateData {
  readonly learner_name: string;
  readonly competence_label: string;
  readonly performance_score: number;
  readonly validated_at: string;
  readonly expires_at: string;
  readonly stamp_id: string;
  readonly proof: AuditProofBundle;
}

@Injectable()
export class CertificateService {
  async generatePdf(data: CertificateData): Promise<Buffer> {
    // Dynamic import to avoid issues with ESM/CJS
    const PDFDocument = (await import("pdfkit")).default;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Uint8Array[] = [];

      doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(24).text("Certificat de Compétence", { align: "center" });
      doc.moveDown(2);

      // Body
      doc.fontSize(14);
      doc.text(`Apprenant: ${data.learner_name}`);
      doc.moveDown(0.5);
      doc.text(`Compétence: ${data.competence_label}`);
      doc.moveDown(0.5);
      doc.text(`Score Performance: ${data.performance_score}%`);
      doc.moveDown(0.5);
      doc.text(`Validé le: ${new Date(data.validated_at).toLocaleDateString("fr-FR")}`);
      doc.moveDown(0.5);
      doc.text(`Expire le: ${new Date(data.expires_at).toLocaleDateString("fr-FR")}`);
      doc.moveDown(2);

      // Proof section
      doc.fontSize(10).fillColor("#666666");
      doc.text("── Preuve cryptographique ──", { align: "center" });
      doc.moveDown(0.5);
      doc.text(`Stamp ID: ${data.stamp_id}`);
      doc.text(`Payload SHA-256: ${data.proof.payload_hash}`);
      doc.text(`Content Version: ${data.proof.content_version_hash}`);
      doc.text(`Signature HMAC: ${data.proof.signature}`);
      doc.text(`Signé le: ${data.proof.signed_at}`);
      doc.text(`Signé par: ${data.proof.signed_by}`);
      doc.moveDown(1);
      doc.text("Ce certificat est vérifiable hors plateforme via le script verify-proof.", {
        align: "center",
      });

      doc.end();
    });
  }
}
