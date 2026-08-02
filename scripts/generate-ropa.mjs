/**
 * Generate Records of Processing Activities (Verzeichnis von Verarbeitungstätigkeiten)
 * Compliant with GDPR Art. 30 requirements
 * German legal document for school's DPO review
 */

import fs from "node:fs";
import path from "node:path";

const ropas = [
  {
    name: "Student Information Management",
    purposes: [
      "Student enrollment and record maintenance",
      "Educational progress tracking",
      "Communication with parents/guardians",
    ],
    dataCategories: ["Name", "DOB", "Contact information", "Academic records"],
    recipients: ["Teachers", "School administration", "Parents/guardians"],
    retentionPeriod: "Duration of enrollment + 2 years",
    legalBasis:
      "GDPR Art. 6(1)(c) - Legal obligation under Schulgesetz (School Law)",
    securityMeasures: [
      "Role-based access control (RBAC)",
      "Encryption at rest and in transit",
      "Audit logging of all data access",
      "Regular security audits",
    ],
  },
  {
    name: "Learning Progress & Assessment",
    purposes: [
      "Track student learning outcomes",
      "Generate report cards and grades",
      "Identify learning support needs",
    ],
    dataCategories: [
      "Assessment scores",
      "Teacher feedback",
      "Learning competencies",
    ],
    recipients: ["Teachers", "School administration", "Parents"],
    retentionPeriod: "1-2 years per Bundesland regulations",
    legalBasis:
      "GDPR Art. 6(1)(a) - Consent + Art. 9(2)(h) - Educational necessity",
    securityMeasures: [
      "Pseudonymization of assessment data where possible",
      "Teacher-student privacy boundaries",
      "Parent-accessible portal with consent gates",
    ],
  },
  {
    name: "AI Tutor Processing",
    purposes: [
      "Personalized learning recommendations",
      "Adaptive tutoring content delivery",
      "Learning analytics and reporting",
    ],
    dataCategories: [
      "Student interaction logs",
      "Learning preferences",
      "Performance metrics",
      "AI model inputs/outputs",
    ],
    recipients: ["AI service provider (if applicable)", "Teachers", "Students"],
    retentionPeriod: "6-12 months after course completion",
    legalBasis:
      "GDPR Art. 6(1)(a) - Explicit consent + Art. 22 - Automated decision safeguards",
    securityMeasures: [
      "Data minimization: only essential features processed",
      "Transparency logs for AI decisions",
      "Human-in-the-loop review for grade-affecting recommendations",
      "Right to explanation mechanism",
    ],
  },
  {
    name: "Exam Monitoring & Integrity",
    purposes: [
      "Exam room monitoring for security",
      "Incident logging (distress signals, technical issues)",
      "Academic integrity verification",
    ],
    dataCategories: [
      "Exam room events",
      "Student signals/requests",
      "Technical logs",
      "Audio/video (if applicable)",
    ],
    recipients: ["Exam proctors", "School administration"],
    retentionPeriod: "6-12 months (shorter if no incident)",
    legalBasis:
      "GDPR Art. 6(1)(a) - Consent + Art. 9(2)(h) - Exam security necessity",
    securityMeasures: [
      "Limited access to exam data (proctors only)",
      "Video/audio encrypted and retained separately",
      "Automated deletion of non-incident logs after retention period",
    ],
  },
  {
    name: "Audit & Compliance Logging",
    purposes: [
      "Regulatory compliance (GDPR, Schulgesetz)",
      "Data breach investigation",
      "User accountability and audit trail",
    ],
    dataCategories: ["User ID", "Action taken", "Timestamp", "Entity accessed"],
    recipients: ["DPO", "School administration", "Schulträger (if requested)"],
    retentionPeriod: "1-2 years",
    legalBasis: "GDPR Art. 6(1)(c) - Legal obligation (compliance duty)",
    securityMeasures: [
      "Immutable audit logs",
      "Restricted DPO-only access",
      "Regular integrity verification",
      "Automated flagging of suspicious access patterns",
    ],
  },
];

function generateRopa(outputPath = "docs/legal") {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const lines = [
    "# Verzeichnis von Verarbeitungstätigkeiten",
    "# (Records of Processing Activities - Art. 30 GDPR)",
    "",
    "**Schulname**: [To be filled by school]",
    "**DPO**: [To be filled by school]",
    "**Schulträger**: [To be filled by school]",
    "**Erstellungsdatum**: " + new Date().toISOString(),
    "",
    "---",
    "",
    "## Einleitung",
    "",
    "Dieses Verzeichnis dokumentiert alle Verarbeitungstätigkeiten personenbezogener Daten durch ExaMetra im Rahmen des deutschen Schulgesetzes (Schulgesetz/BDSG-SchulG) und der DSGVO.",
    "",
    "**HINWEIS**: Dies ist eine Vorlage. Ihre Schule muss dieses Dokument durch ihren Datenschutzbeauftragten überprüfen und finalisieren, bevor es als offizielle Dokumentation gilt.",
    "",
    "---",
    "",
  ];

  for (let i = 0; i < ropas.length; i++) {
    const ropa = ropas[i];
    lines.push(
      `## Verarbeitungstätigkeit ${i + 1}: ${ropa.name}`,
      "",
      "### Zwecke der Verarbeitung",
      ...ropa.purposes.map((p) => `- ${p}`),
      "",
      "### Kategorien personenbezogener Daten",
      ...ropa.dataCategories.map((c) => `- ${c}`),
      "",
      "### Kategorien von Empfängern",
      ...ropa.recipients.map((r) => `- ${r}`),
      "",
      "### Speicherdauer",
      `${ropa.retentionPeriod}`,
      "",
      "### Rechtsgrundlage",
      `${ropa.legalBasis}`,
      "",
      "### Technische und organisatorische Maßnahmen",
      ...ropa.securityMeasures.map((m) => `- ${m}`),
      ""
    );
  }

  lines.push(
    "---",
    "",
    "## Betroffenenrechte (DSGVO Art. 12-22)",
    "",
    "Alle Personen haben das Recht auf:",
    "- **Auskunft** (Art. 15): Zugang zu ihren Daten",
    "- **Berichtigung** (Art. 16): Korrektur ungenauer Daten",
    "- **Löschung** (Art. 17): Unter rechtlichen Bedingungen",
    "- **Datenportabilität** (Art. 20): Export ihrer Daten",
    "- **Widerspruch** (Art. 21): Gegen bestimmte Verarbeitungen",
    "",
    "Anträge richten Sie an den Datenschutzbeauftragten (DPO).",
    "",
    "## Datenschutzverletzungen",
    "",
    "Bei Verdacht auf eine Datenschutzverletzung kontaktieren Sie sofort den DPO und die zuständige Aufsichtsbehörde.",
    "",
    `**Generiert**: ${new Date().toISOString()}`,
    "**Quelle**: ExaMetra Module L - Compliance Framework",
  );

  const filePath = path.join(
    outputPath,
    "verzeichnis-verarbeitungstaetigkeiten.md"
  );
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  console.log(
    `[v0] Generated RoPA (Verzeichnis) at ${filePath}`
  );
}

if (require.main === module) {
  generateRopa();
}
