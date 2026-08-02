/**
 * Generate DATA_MODEL.md from Prisma schema and database config
 * This document lists all data entities, their purposes, legal basis, and retention categories
 */

import fs from "node:fs";
import path from "node:path";

// Core data model definition
const dataModel = [
  {
    name: "User",
    dataCategories: ["firstName", "lastName", "email", "role", "createdAt"],
    legalBasis: "GDPR Art. 6(1)(c) - Legal obligation (Schulgesetz)",
    purpose: "User account management and authentication",
    retentionCategory: "TEACHER_AUDIT_LOG",
    notes: "Retained per employment contract or student enrollment period",
  },
  {
    name: "Student",
    dataCategories: [
      "firstName",
      "lastName",
      "dateOfBirth",
      "email",
      "phone",
      "address",
    ],
    legalBasis: "GDPR Art. 6(1)(c) - Legal obligation (Schulgesetz)",
    purpose: "Student record management and communication",
    retentionCategory: "LEARNING_PROGRESS",
  },
  {
    name: "ClassGroup",
    dataCategories: ["name", "grade", "year", "studentCount"],
    legalBasis: "GDPR Art. 6(1)(c) - Legal obligation (Schulgesetz)",
    purpose: "Class organization and grouping",
    retentionCategory: "LEARNING_PROGRESS",
  },
  {
    name: "Assessment",
    dataCategories: ["studentId", "subjectId", "score", "feedback", "date"],
    legalBasis:
      "GDPR Art. 6(1)(a) - Consent + Art. 8 (children) - Parental consent",
    purpose: "Record student learning progress and performance",
    retentionCategory: "ASSESSMENT_RESULT",
  },
  {
    name: "Report (Final Grade Report)",
    dataCategories: ["studentId", "finalGrades", "comments", "semester"],
    legalBasis:
      "GDPR Art. 6(1)(c) - Legal obligation (Schulgesetz - long-term retention requirement)",
    purpose: "Permanent record of student academic achievement",
    retentionCategory: "FINAL_REPORT",
    notes: "Typically retained for student lifetime + 30 years (per Bundesland law)",
  },
  {
    name: "BehaviorIncident",
    dataCategories: ["studentId", "incidentType", "description", "resolution"],
    legalBasis:
      "GDPR Art. 6(1)(a) - Consent + Art. 9(2)(h) - Health/safety necessity",
    purpose: "Track disciplinary actions and behavioral support",
    retentionCategory: "DISCIPLINARY_RECORD",
    notes: "Retention varies by Bundesland; typically 3-10 years",
  },
  {
    name: "ExamIncidentEvent",
    dataCategories: ["studentId", "eventType", "timestamp", "notes"],
    legalBasis:
      "GDPR Art. 6(1)(a) - Consent + Art. 9(2)(h) - Exam integrity necessity",
    purpose: "Log exam-time incidents (distress, technical issues)",
    retentionCategory: "EXAM_INCIDENT",
    notes: "Shorter retention (6-12 months) unless escalated to disciplinary record",
  },
  {
    name: "Message",
    dataCategories: ["senderId", "recipientId", "content", "timestamp"],
    legalBasis: "GDPR Art. 6(1)(a) - Consent (user opt-in for messaging)",
    purpose: "Communication between teachers, parents, and students",
    retentionCategory: "MESSAGE",
  },
  {
    name: "AuditLog",
    dataCategories: ["userId", "action", "entityType", "timestamp"],
    legalBasis: "GDPR Art. 6(1)(c) - Legal obligation (data protection compliance)",
    purpose: "Audit trail for regulatory compliance and breach investigation",
    retentionCategory: "TEACHER_AUDIT_LOG",
  },
  {
    name: "Notebook (Student Learning Notebooks)",
    dataCategories: ["studentId", "content", "createdAt"],
    legalBasis: "GDPR Art. 6(1)(a) - Consent (student/parent consent)",
    purpose: "Student learning portfolio and reflection entries",
    retentionCategory: "NOTEBOOK_PAGE",
  },
  {
    name: "AITutorLog",
    dataCategories: ["studentId", "interaction", "timestamp", "response"],
    legalBasis: "GDPR Art. 6(1)(a) - Explicit consent + Art. 22 - Automated decisions",
    purpose: "Track AI tutor interactions for learning analytics",
    retentionCategory: "AI_TUTOR_LOG",
    notes: "Subject to Art. 22 GDPR - no solely automated grading decisions",
  },
];

function generateDataModel(outputPath = "docs/legal") {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const lines = [
    "# Data Model Documentation",
    "",
    "**Status**: Schema Reference for ExaMetra (Module L)",
    "",
    "This document outlines all personal data entities collected by ExaMetra, their legal basis, purpose, and retention category.",
    "",
    "## Core Entities",
    "",
    "| Entity | Data Categories | Legal Basis | Purpose | Retention Category | Notes |",
    "|--------|-----------------|------------|---------|-------------------|-------|",
  ];

  for (const entity of dataModel) {
    const dataCategories = entity.dataCategories.join(", ");
    const notes = entity.notes ? `${entity.notes}` : "—";
    const row = `| **${entity.name}** | ${dataCategories} | ${entity.legalBasis} | ${entity.purpose} | **${entity.retentionCategory}** | ${notes} |`;
    lines.push(row);
  }

  lines.push(
    "",
    "## Retention Categories",
    "",
    "| Category | Typical Retention | Legal Basis |",
    "|----------|------------------|------------|",
    "| LEARNING_PROGRESS | 1-2 years | Bundesland school law (Schulgesetz) |",
    "| ASSESSMENT_RESULT | 1-2 years | Bundesland school law |",
    "| FINAL_REPORT | 30+ years | Permanent record under Schulgesetz |",
    "| DISCIPLINARY_RECORD | 3-10 years | Varies by Bundesland |",
    "| EXAM_INCIDENT | 6-12 months | Exam integrity + school safety |",
    "| MESSAGE | 1-2 years | Communication retention best practices |",
    "| AI_TUTOR_LOG | 6-12 months | Pedagogical purpose + learning analytics |",
    "| NOTEBOOK_PAGE | 1-2 years | Student portfolio / learning records |",
    "| SIGNAGE_LOG | 3 months | Safety monitoring (emergency only) |",
    "| TEACHER_AUDIT_LOG | 1-2 years | Compliance and audit trail |",
    "",
    "## Compliance Notes",
    "",
    "- **DPO Review**: Each retention period must be reviewed and approved by your school's Data Protection Officer (DPO)",
    "- **Bundesland Variations**: Retention periods may vary by state (Bundesland). Consult your regional school authority.",
    "- **Parental Consent**: For student data (especially minors), parental consent is required per Art. 8 GDPR",
    "- **Automated Decisions**: No solely automated decisions (e.g., automatic grade lowering) without human review per Art. 22 GDPR",
    "- **Data Subject Rights**: All entities are subject to GDPR rights: access, correction, erasure (where legally permitted), portability",
    "",
    "## Generated From",
    "",
    `Generated: ${new Date().toISOString()}`,
    "Source: ExaMetra Prisma schema (Module L)",
  );

  const filePath = path.join(outputPath, "DATA_MODEL.md");
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  console.log(`[v0] Generated DATA_MODEL.md at ${filePath}`);
}

if (require.main === module) {
  generateDataModel();
}
