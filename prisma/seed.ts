/**
 * CompetenceTrack — Prisma Seed Script
 * Populates the database with realistic demo data for a Berlin elementary school.
 *
 * Usage: bun prisma/seed.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Helper: random date within last N days ──────────────────────────────
function randomDateWithinLast(days: number): Date {
  const now = new Date()
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  const diff = now.getTime() - past.getTime()
  return new Date(past.getTime() + Math.random() * diff)
}

// ─── Helper: random integer in range [min, max] ──────────────────────────
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ─── Helper: pick random element from array ──────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('🌱 Seeding CompetenceTrack database...\n')

  // Clean up existing data (order matters due to foreign keys)
  console.log('  🧹 Cleaning existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.behaviorIncident.deleteMany()
  await prisma.behaviorCategory.deleteMany()
  await prisma.commentBankEntry.deleteMany()
  await prisma.commentCategory.deleteMany()
  await prisma.rubricLevel.deleteMany()
  await prisma.rubricCriterion.deleteMany()
  await prisma.rubric.deleteMany()
  await prisma.parentMessage.deleteMany()
  await prisma.parentContact.deleteMany()
  await prisma.lessonPlan.deleteMany()
  await prisma.teacherNote.deleteMany()
  await prisma.attendanceRecord.deleteMany()
  await prisma.attendanceSession.deleteMany()
  await prisma.gradingWeightRule.deleteMany()
  await prisma.gradingScheme.deleteMany()
  await prisma.computedGrade.deleteMany()
  await prisma.reportSection.deleteMany()
  await prisma.report.deleteMany()
  await prisma.dataExportRequest.deleteMany()
  await prisma.assessmentResult.deleteMany()
  await prisma.assessmentCompetencyLink.deleteMany()
  await prisma.assessment.deleteMany()
  await prisma.learningProgressEntry.deleteMany()
  await prisma.masteryLevelDefinition.deleteMany()
  await prisma.competency.deleteMany()
  await prisma.competencyCategory.deleteMany()
  await prisma.classCompetencyAssignment.deleteMany()
  await prisma.competencyTemplate.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.classGroupTeacher.deleteMany()
  await prisma.classGroup.deleteMany()
  await prisma.student.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.schoolYear.deleteMany()
  await prisma.user.deleteMany()
  await prisma.school.deleteMany()
  console.log('  ✅ Cleaned up.\n')

  // ─── 1. Demo School ───────────────────────────────────────────────────
  console.log('  🏫 Creating school...')
  const school = await prisma.school.create({
    data: {
      name: 'Grundschule Am Park',
      schoolType: 'ELEMENTARY',
      country: 'DE',
      timezone: 'Europe/Berlin',
    },
  })

  // ─── 2. Demo School Year ──────────────────────────────────────────────
  console.log('  📅 Creating school year...')
  const schoolYear = await prisma.schoolYear.create({
    data: {
      schoolId: school.id,
      label: '2025/2026',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2026-07-31'),
    },
  })

  // ─── 3. Demo Users ──────────────────────────────────────────────────
  console.log('  👩‍🏫 Creating demo users...')
  const passwordHash = await bcrypt.hash('Demo2025!', 10)
  const teacher = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: 'demo@competencetrack.org',
      passwordHash,
      firstName: 'Anna',
      lastName: 'Müller',
      role: 'SCHOOL_ADMIN',
      locale: 'de',
      isDemo: true,
    },
  })

  // Demo Teacher (regular teacher role)
  const demoTeacher = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: 'demo.teacher@competencetrack.org',
      passwordHash,
      firstName: 'Max',
      lastName: 'Lehrer',
      role: 'TEACHER',
      locale: 'de',
      isDemo: true,
    },
  })

  // Demo Student (student user account)
  const demoStudent = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: 'demo.student@competencetrack.org',
      passwordHash,
      firstName: 'Lena',
      lastName: 'Schüler',
      role: 'STUDENT',
      locale: 'de',
      isDemo: true,
    },
  })

  // Demo Parent (parent user account)
  const demoParent = await prisma.user.create({
    data: {
      schoolId: school.id,
      email: 'demo.parent@competencetrack.org',
      passwordHash,
      firstName: 'Thomas',
      lastName: 'Elter',
      role: 'PARENT',
      locale: 'de',
      isDemo: true,
    },
  })

  // ─── 4. Demo Classes ──────────────────────────────────────────────────
  console.log('  🏫 Creating classes...')
  const class3a = await prisma.classGroup.create({
    data: {
      schoolId: school.id,
      schoolYearId: schoolYear.id,
      name: '3a',
      gradeLevel: 3,
      schoolType: 'ELEMENTARY',
    },
  })

  const class3b = await prisma.classGroup.create({
    data: {
      schoolId: school.id,
      schoolYearId: schoolYear.id,
      name: '3b',
      gradeLevel: 3,
      schoolType: 'ELEMENTARY',
    },
  })

  // Assign teacher roles
  await prisma.classGroupTeacher.create({
    data: {
      classGroupId: class3a.id,
      userId: teacher.id,
      role: 'HOMEROOM_TEACHER',
    },
  })

  await prisma.classGroupTeacher.create({
    data: {
      classGroupId: class3b.id,
      userId: teacher.id,
      role: 'SUBJECT_TEACHER',
    },
  })

  // Assign demo teacher to class 3b as subject teacher
  await prisma.classGroupTeacher.create({
    data: {
      classGroupId: class3b.id,
      userId: demoTeacher.id,
      role: 'HOMEROOM_TEACHER',
    },
  })

  // ─── 5. Demo Students ─────────────────────────────────────────────────
  console.log('  👧🧒 Creating students...')

  // 3a students (8 students)
  const students3aNames = [
    { firstName: 'Lena', lastName: 'Schmidt', dob: '2016-03-12' },
    { firstName: 'Maximilian', lastName: 'Weber', dob: '2016-07-22' },
    { firstName: 'Sophie', lastName: 'Schneider', dob: '2016-01-08' },
    { firstName: 'Felix', lastName: 'Fischer', dob: '2016-09-15' },
    { firstName: 'Emma', lastName: 'Meyer', dob: '2016-05-30' },
    { firstName: 'Lukas', lastName: 'Wagner', dob: '2016-11-04' },
    { firstName: 'Mia', lastName: 'Becker', dob: '2016-02-18' },
    { firstName: 'Jonas', lastName: 'Hoffmann', dob: '2016-08-27' },
  ]

  // 3b students (7 students)
  const students3bNames = [
    { firstName: 'Hannah', lastName: 'Koch', dob: '2016-04-09' },
    { firstName: 'Leon', lastName: 'Richter', dob: '2016-12-01' },
    { firstName: 'Clara', lastName: 'Klein', dob: '2016-06-14' },
    { firstName: 'Tim', lastName: 'Schröder', dob: '2016-10-20' },
    { firstName: 'Anna-Lena', lastName: 'Braun', dob: '2016-03-25' },
    { firstName: 'David', lastName: 'Zimmermann', dob: '2016-07-03' },
    { firstName: 'Laura', lastName: 'Krüger', dob: '2016-01-30' },
  ]

  const students3a: { id: string; firstName: string; lastName: string }[] = []
  const students3b: { id: string; firstName: string; lastName: string }[] = []

  for (const s of students3aNames) {
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        firstName: s.firstName,
        lastName: s.lastName,
        dateOfBirth: new Date(s.dob),
      },
    })
    students3a.push(student)

    // Enroll in class 3a
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classGroupId: class3a.id,
        schoolYearId: schoolYear.id,
        startDate: new Date('2025-08-01'),
      },
    })
  }

  for (const s of students3bNames) {
    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        firstName: s.firstName,
        lastName: s.lastName,
        dateOfBirth: new Date(s.dob),
      },
    })
    students3b.push(student)

    // Enroll in class 3b
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classGroupId: class3b.id,
        schoolYearId: schoolYear.id,
        startDate: new Date('2025-08-01'),
      },
    })
  }

  console.log(`    Created ${students3a.length} students in 3a, ${students3b.length} students in 3b`)

  // ─── 6. Subjects ──────────────────────────────────────────────────────
  console.log('  📚 Creating subjects...')
  const mathSubject = await prisma.subject.create({
    data: {
      schoolId: school.id,
      name: 'Mathematik',
      gradeLevelMin: 1,
      gradeLevelMax: 4,
    },
  })

  const germanSubject = await prisma.subject.create({
    data: {
      schoolId: school.id,
      name: 'Deutsch',
      gradeLevelMin: 1,
      gradeLevelMax: 4,
    },
  })

  // ─── 7. Competency Templates ──────────────────────────────────────────
  console.log('  🎯 Creating competency templates...')

  // ─── Math Template ─────────────────────────────────────────────────────
  const mathTemplate = await prisma.competencyTemplate.create({
    data: {
      name: 'Mathematik Klasse 3',
      description: 'Kompetenzraster für Mathematik in Klasse 3 gemäß Rahmenlehrplan Berlin-Brandenburg',
      subjectId: mathSubject.id,
      schoolType: 'ELEMENTARY',
      gradeLevelMin: 3,
      gradeLevelMax: 3,
      isGlobalTemplate: false,
      createdByUserId: teacher.id,
      version: 1,
      schoolId: school.id,
    },
  })

  // Math categories
  const mathCatZahlen = await prisma.competencyCategory.create({
    data: {
      competencyTemplateId: mathTemplate.id,
      name: 'Zahlen und Operationen',
      order: 0,
      color: '#10b981',
    },
  })

  const mathCatGeometrie = await prisma.competencyCategory.create({
    data: {
      competencyTemplateId: mathTemplate.id,
      name: 'Geometrie',
      order: 1,
      color: '#f59e0b',
    },
  })

  const mathCatGroessen = await prisma.competencyCategory.create({
    data: {
      competencyTemplateId: mathTemplate.id,
      name: 'Größen und Messen',
      order: 2,
      color: '#8b5cf6',
    },
  })

  // Math competencies — Zahlen und Operationen
  const mathCompZAH01 = await prisma.competency.create({
    data: {
      categoryId: mathCatZahlen.id,
      code: 'M.3.ZAH.01',
      title: 'Zahlenraum bis 1000 erfassen',
      description: 'Die Schülerinnen und Schüler können den Zahlenraum bis 1000 darstellen, ordnen und vergleichen.',
      order: 0,
    },
  })

  const mathCompZAH02 = await prisma.competency.create({
    data: {
      categoryId: mathCatZahlen.id,
      code: 'M.3.ZAH.02',
      title: 'Schriftliche Addition und Subtraktion',
      description: 'Die Schülerinnen und Schüler können schriftliche Addition und Subtraktion im Zahlenraum bis 1000 durchführen.',
      order: 1,
    },
  })

  const mathCompZAH03 = await prisma.competency.create({
    data: {
      categoryId: mathCatZahlen.id,
      code: 'M.3.ZAH.03',
      title: 'Multiplikation und Division',
      description: 'Die Schülerinnen und Schüler beherrschen das kleine Einmaleins und können einfache Multiplikations- und Divisionsaufgaben lösen.',
      order: 2,
    },
  })

  // Math competencies — Geometrie
  const mathCompGEO01 = await prisma.competency.create({
    data: {
      categoryId: mathCatGeometrie.id,
      code: 'M.3.GEO.01',
      title: 'Ebenen Figuren erkennen und benennen',
      description: 'Die Schülerinnen und Schüler können ebene Figuren wie Dreieck, Viereck, Kreis erkennen und benennen.',
      order: 0,
    },
  })

  const mathCompGEO02 = await prisma.competency.create({
    data: {
      categoryId: mathCatGeometrie.id,
      code: 'M.3.GEO.02',
      title: 'Umfang und Flächeninhalt vergleichen',
      description: 'Die Schülerinnen und Schüler können den Umfang und den Flächeninhalt einfacher Figuren vergleichen und messen.',
      order: 1,
    },
  })

  // Math competencies — Größen und Messen
  const mathCompGRO01 = await prisma.competency.create({
    data: {
      categoryId: mathCatGroessen.id,
      code: 'M.3.GRO.01',
      title: 'Längen messen und umrechnen',
      description: 'Die Schülerinnen und Schüler können Längen mit appropriateen Maßeinheiten messen und zwischen m, dm, cm umrechnen.',
      order: 0,
    },
  })

  const mathCompGRO02 = await prisma.competency.create({
    data: {
      categoryId: mathCatGroessen.id,
      code: 'M.3.GRO.02',
      title: 'Geldbeträge berechnen',
      description: 'Die Schülerinnen und Schüler können mit Geldbeträgen in Euro und Cent rechnen und diese vergleichen.',
      order: 1,
    },
  })

  // Mastery level definitions for all Math competencies
  const masteryLevels = [
    { levelValue: 1, label: 'noch nicht erreicht' },
    { levelValue: 2, label: 'entwickelt sich' },
    { levelValue: 3, label: 'kompetent' },
    { levelValue: 4, label: 'weit entwickelt' },
  ]

  const mathCompetencies = [mathCompZAH01, mathCompZAH02, mathCompZAH03, mathCompGEO01, mathCompGEO02, mathCompGRO01, mathCompGRO02]

  for (const comp of mathCompetencies) {
    for (const ml of masteryLevels) {
      await prisma.masteryLevelDefinition.create({
        data: {
          competencyId: comp.id,
          levelValue: ml.levelValue,
          label: ml.label,
          description: ml.levelValue === 1
            ? 'Die Kompetenz ist noch nicht erreicht.'
            : ml.levelValue === 2
            ? 'Die Kompetenz entwickelt sich, erste Ansätze sind erkennbar.'
            : ml.levelValue === 3
            ? 'Die Kompetenz wird sicher und selbstständig gezeigt.'
            : 'Die Kompetenz wird weit über das erwartete Niveau hinaus gezeigt.',
        },
      })
    }
  }

  // ─── Deutsch Template ──────────────────────────────────────────────────
  const germanTemplate = await prisma.competencyTemplate.create({
    data: {
      name: 'Deutsch Klasse 3',
      description: 'Kompetenzraster für Deutsch in Klasse 3 gemäß Rahmenlehrplan Berlin-Brandenburg',
      subjectId: germanSubject.id,
      schoolType: 'ELEMENTARY',
      gradeLevelMin: 3,
      gradeLevelMax: 3,
      isGlobalTemplate: false,
      createdByUserId: teacher.id,
      version: 1,
      schoolId: school.id,
    },
  })

  // German categories
  const germanCatLesen = await prisma.competencyCategory.create({
    data: {
      competencyTemplateId: germanTemplate.id,
      name: 'Lesen',
      order: 0,
      color: '#3b82f6',
    },
  })

  const germanCatSchreiben = await prisma.competencyCategory.create({
    data: {
      competencyTemplateId: germanTemplate.id,
      name: 'Schreiben',
      order: 1,
      color: '#ef4444',
    },
  })

  const germanCatSprechen = await prisma.competencyCategory.create({
    data: {
      competencyTemplateId: germanTemplate.id,
      name: 'Sprechen und Zuhören',
      order: 2,
      color: '#06b6d4',
    },
  })

  // German competencies — Lesen
  const germanCompLES01 = await prisma.competency.create({
    data: {
      categoryId: germanCatLesen.id,
      code: 'D.3.LES.01',
      title: 'Altergerechte Texte sinnentnehmend lesen',
      description: 'Die Schülerinnen und Schüler können altersgerechte Texte flüssig lesen und den Inhalt verstehen.',
      order: 0,
    },
  })

  const germanCompLES02 = await prisma.competency.create({
    data: {
      categoryId: germanCatLesen.id,
      code: 'D.3.LES.02',
      title: 'Texte zusammenfassen und interpretieren',
      description: 'Die Schülerinnen und Schüler können gelesene Texte in eigenen Worten zusammenfassen und einfache Schlussfolgerungen ziehen.',
      order: 1,
    },
  })

  // German competencies — Schreiben
  const germanCompSCH01 = await prisma.competency.create({
    data: {
      categoryId: germanCatSchreiben.id,
      code: 'D.3.SCH.01',
      title: 'Texte verfassen (Erzählung, Beschreibung)',
      description: 'Die Schülerinnen und Schüler können kurze Erzählungen und Beschreibungen verfassen.',
      order: 0,
    },
  })

  const germanCompSCH02 = await prisma.competency.create({
    data: {
      categoryId: germanCatSchreiben.id,
      code: 'D.3.SCH.02',
      title: 'Rechtschreibung anwenden',
      description: 'Die Schülerinnen und Schüler können grundlegende Rechtschreibregeln anwenden.',
      order: 1,
    },
  })

  const germanCompSCH03 = await prisma.competency.create({
    data: {
      categoryId: germanCatSchreiben.id,
      code: 'D.3.SCH.03',
      title: 'Sätze und Texte gliedern',
      description: 'Die Schülerinnen und Schüler können Sätze sinnvoll gliedern und Texte strukturieren.',
      order: 2,
    },
  })

  // German competencies — Sprechen und Zuhören
  const germanCompSPR01 = await prisma.competency.create({
    data: {
      categoryId: germanCatSprechen.id,
      code: 'D.3.SPR.01',
      title: 'Zuhören und verstehen',
      description: 'Die Schülerinnen und Schüler können aufmerksam zuhören und Gehörtes wiedergeben.',
      order: 0,
    },
  })

  const germanCompSPR02 = await prisma.competency.create({
    data: {
      categoryId: germanCatSprechen.id,
      code: 'D.3.SPR.02',
      title: 'Sachgerecht sprechen und erzählen',
      description: 'Die Schülerinnen und Schüler können sich sachgerecht ausdrücken und Erlebnisse zusammenhängend erzählen.',
      order: 1,
    },
  })

  // Mastery level definitions for all German competencies
  const germanCompetencies = [germanCompLES01, germanCompLES02, germanCompSCH01, germanCompSCH02, germanCompSCH03, germanCompSPR01, germanCompSPR02]

  for (const comp of germanCompetencies) {
    for (const ml of masteryLevels) {
      await prisma.masteryLevelDefinition.create({
        data: {
          competencyId: comp.id,
          levelValue: ml.levelValue,
          label: ml.label,
          description: ml.levelValue === 1
            ? 'Die Kompetenz ist noch nicht erreicht.'
            : ml.levelValue === 2
            ? 'Die Kompetenz entwickelt sich, erste Ansätze sind erkennbar.'
            : ml.levelValue === 3
            ? 'Die Kompetenz wird sicher und selbstständig gezeigt.'
            : 'Die Kompetenz wird weit über das erwartete Niveau hinaus gezeigt.',
        },
      })
    }
  }

  // ─── 8. ClassCompetencyAssignment ──────────────────────────────────────
  console.log('  🔗 Assigning competency templates to class 3a...')
  const mathAssignment = await prisma.classCompetencyAssignment.create({
    data: {
      classGroupId: class3a.id,
      subjectId: mathSubject.id,
      competencyTemplateId: mathTemplate.id,
      schoolYearId: schoolYear.id,
    },
  })

  const germanAssignment = await prisma.classCompetencyAssignment.create({
    data: {
      classGroupId: class3a.id,
      subjectId: germanSubject.id,
      competencyTemplateId: germanTemplate.id,
      schoolYearId: schoolYear.id,
    },
  })

  // ─── 9. Learning Progress Entries ──────────────────────────────────────
  console.log('  📊 Creating learning progress entries...')

  const allCompetencies = [...mathCompetencies, ...germanCompetencies]
  const progressNotes = [
    'Zeigt gute Fortschritte im Unterricht.',
    'Braucht noch zusätzliche Übung.',
    'Hat das Thema sicher verstanden.',
    'Kann das Gelernte selbstständig anwenden.',
    'Hat in der Gruppenarbeit gut mitgemacht.',
    'Benötigt noch Unterstützung bei komplexeren Aufgaben.',
    'Hervorragende Mitarbeit heute.',
    'Hat Schwierigkeiten mit dem Thema, braucht Förderung.',
    null,
    null,
  ]

  let progressCount = 0
  for (let i = 0; i < 30; i++) {
    const student = pick(students3a)
    const competency = pick(allCompetencies)
    const date = randomDateWithinLast(60)
    // Weighted mastery: most students are 2-3, fewer at 1 or 4
    const mastery = pick([1, 2, 2, 2, 3, 3, 3, 3, 4])

    await prisma.learningProgressEntry.create({
      data: {
        studentId: student.id,
        competencyId: competency.id,
        teacherId: teacher.id,
        classGroupId: class3a.id,
        date,
        masteryLevelValue: mastery,
        note: pick(progressNotes),
      },
    })
    progressCount++
  }
  console.log(`    Created ${progressCount} learning progress entries`)

  // ─── 10. Assessment ────────────────────────────────────────────────────
  console.log('  📝 Creating assessment...')
  const assessment = await prisma.assessment.create({
    data: {
      classGroupId: class3a.id,
      subjectId: mathSubject.id,
      teacherId: teacher.id,
      title: 'Mathematik Test 1',
      date: new Date('2025-10-15'),
      type: 'TEST',
      maxScore: 20,
      weight: 2.0,
    },
  })

  // Link assessment to Math competencies (ZAH ones primarily)
  const mathAssessmentCompetencies = [mathCompZAH01, mathCompZAH02, mathCompZAH03]
  for (const comp of mathAssessmentCompetencies) {
    await prisma.assessmentCompetencyLink.create({
      data: {
        assessmentId: assessment.id,
        competencyId: comp.id,
        weight: 1.0,
      },
    })
  }

  // Create assessment results for all students in 3a
  for (const student of students3a) {
    // Realistic score distribution: mean around 14/20, some variation
    const score = Math.min(20, Math.max(4, Math.round(randInt(8, 19) + randInt(-3, 3))))
    const clampedScore = Math.min(20, Math.max(0, score))

    // Map score to mastery level (rough mapping)
    const masteryFromScore = clampedScore >= 17 ? 4 : clampedScore >= 13 ? 3 : clampedScore >= 8 ? 2 : 1

    await prisma.assessmentResult.create({
      data: {
        assessmentId: assessment.id,
        studentId: student.id,
        score: clampedScore,
        masteryLevelValue: masteryFromScore,
      },
    })
  }
  console.log(`    Created assessment with ${students3a.length} results`)

  // ─── 11. Grading Scheme ────────────────────────────────────────────────
  console.log('  📋 Creating grading scheme...')
  const gradingScheme = await prisma.gradingScheme.create({
    data: {
      classGroupId: class3a.id,
      subjectId: mathSubject.id,
      schoolId: school.id,
      name: 'Noten 1-6 Mathematik 3a',
      type: 'NUMERIC_GRADE',
      scaleDefinition: JSON.stringify({
        min: 1,
        max: 6,
        labels: {
          '1': 'sehr gut',
          '2': 'gut',
          '3': 'befriedigend',
          '4': 'ausreichend',
          '5': 'mangelhaft',
          '6': 'ungenügend',
        },
      }),
    },
  })

  // Grading weight rules
  await prisma.gradingWeightRule.create({
    data: {
      gradingSchemeId: gradingScheme.id,
      sourceType: 'LEARNING_PROGRESS',
      weightPercent: 50.0,
    },
  })

  await prisma.gradingWeightRule.create({
    data: {
      gradingSchemeId: gradingScheme.id,
      sourceType: 'ASSESSMENT',
      weightPercent: 50.0,
    },
  })

  // ─── 12. Audit Log Entries ─────────────────────────────────────────────
  console.log('  📝 Creating audit log entries...')
  const auditEntries = [
    {
      action: 'CREATE',
      entityType: 'CompetencyTemplate',
      entityId: mathTemplate.id,
      metadata: JSON.stringify({ templateName: 'Mathematik Klasse 3' }),
    },
    {
      action: 'CREATE',
      entityType: 'CompetencyTemplate',
      entityId: germanTemplate.id,
      metadata: JSON.stringify({ templateName: 'Deutsch Klasse 3' }),
    },
    {
      action: 'CREATE',
      entityType: 'Assessment',
      entityId: assessment.id,
      metadata: JSON.stringify({ title: 'Mathematik Test 1', class: '3a' }),
    },
    {
      action: 'ASSIGN',
      entityType: 'ClassCompetencyAssignment',
      entityId: mathAssignment.id,
      metadata: JSON.stringify({ class: '3a', subject: 'Mathematik' }),
    },
    {
      action: 'ASSIGN',
      entityType: 'ClassCompetencyAssignment',
      entityId: germanAssignment.id,
      metadata: JSON.stringify({ class: '3a', subject: 'Deutsch' }),
    },
  ]

  for (const entry of auditEntries) {
    await prisma.auditLog.create({
      data: {
        userId: teacher.id,
        schoolId: school.id,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        timestamp: randomDateWithinLast(30),
        metadata: entry.metadata,
      },
    })
  }

  // ─── 13. Lesson Plans ──────────────────────────────────────────────────
  console.log('  📅 Creating lesson plans...')

  // Helper: get a date in the current week (Mon-Fri) at a given hour
  function dateThisWeek(dayOffset: number, hour: number, minute = 0): Date {
    const now = new Date()
    const day = now.getDay() // 0 = Sunday, 1 = Monday
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMonday)
    monday.setHours(hour, minute, 0, 0)
    const result = new Date(monday)
    result.setDate(monday.getDate() + dayOffset)
    return result
  }

  function dateLastWeek(dayOffset: number, hour: number, minute = 0): Date {
    const d = dateThisWeek(dayOffset, hour, minute)
    d.setDate(d.getDate() - 7)
    return d
  }

  // Lesson 1: draft, scheduled for later this week
  await prisma.lessonPlan.create({
    data: {
      teacherId: teacher.id,
      classGroupId: class3a.id,
      subjectId: mathSubject.id,
      title: 'Schriftliche Addition bis 1000',
      description: 'Einführung in die schriftliche Addition im Zahlenraum bis 1000 mit Übertrag.',
      date: dateThisWeek(2, 9, 0), // Wednesday this week, 09:00
      durationMin: 45,
      status: 'draft',
      objectives: JSON.stringify([
        'SuS können die schriftliche Addition sachgerecht durchführen.',
        'SuS beherrschen den Übertrag korrekt.',
        'SuS können eigene Aufgaben lösen und vergleichen.',
      ]),
      materials: JSON.stringify([
        'Schulbuch S. 42–43',
        'Arbeitsblatt Addition',
        'Plättchen als Anschauungsmaterial',
      ]),
      homework: 'Arbeitsblatt Aufgabe 1–3',
      reflection: null,
      linkedCompetencyIds: JSON.stringify([mathCompZAH02.id, mathCompZAH01.id]),
    },
  })

  // Lesson 2: scheduled, this week Tuesday
  await prisma.lessonPlan.create({
    data: {
      teacherId: teacher.id,
      classGroupId: class3a.id,
      subjectId: germanSubject.id,
      title: 'Leseverstehen: Märchen untersuchen',
      description: 'Gemeinsames Lesen eines Märchens, Erarbeitung von Merkmalen.',
      date: dateThisWeek(1, 10, 30), // Tuesday this week, 10:30
      durationMin: 45,
      status: 'scheduled',
      objectives: JSON.stringify([
        'SuS können Merkmale eines Märchens nennen.',
        'SuS können die Handlung in eigenen Worten wiedergeben.',
      ]),
      materials: JSON.stringify([
        'Märchen "Rotkäppchen" (Kopiervorlage)',
        'Lesezeichen mit Märchenmerkmalen',
        'Interaktives Tafelbild',
      ]),
      homework: 'Märchen zu Ende lesen und eine Frage notieren.',
      reflection: null,
      linkedCompetencyIds: JSON.stringify([germanCompLES01.id, germanCompLES02.id]),
    },
  })

  // Lesson 3: scheduled, this week Thursday
  await prisma.lessonPlan.create({
    data: {
      teacherId: teacher.id,
      classGroupId: class3a.id,
      subjectId: mathSubject.id,
      title: 'Geometrische Figuren — Vierecke',
      description: 'Erkennen und Benennen von Vierecken (Quadrat, Rechteck, Raute, Parallelogramm).',
      date: dateThisWeek(3, 9, 0), // Thursday this week, 09:00
      durationMin: 45,
      status: 'scheduled',
      objectives: JSON.stringify([
        'SuS können verschiedene Vierecke benennen.',
        'SuS können Eigenschaften der Vierecke beschreiben.',
      ]),
      materials: JSON.stringify([
        'Geometrische Formen aus Pappe',
        'Arbeitsblatt "Vierecke sortieren"',
        'Geodreieck',
      ]),
      homework: 'Arbeitsblatt "Finde Vierecke in der Klasse"',
      reflection: null,
      linkedCompetencyIds: JSON.stringify([mathCompGEO01.id]),
    },
  })

  // Lesson 4: completed last week
  await prisma.lessonPlan.create({
    data: {
      teacherId: teacher.id,
      classGroupId: class3a.id,
      subjectId: mathSubject.id,
      title: 'Multiplikation — Einmaleins wiederholen',
      description: 'Wiederholung des kleinen Einmaleins mit Spielen und Übungen.',
      date: dateLastWeek(1, 9, 0), // Last week Tuesday, 09:00
      durationMin: 45,
      status: 'completed',
      objectives: JSON.stringify([
        'SuS können das kleine Einmaleins sicher anwenden.',
        'SuS können Aufgaben in Partnerarbeit lösen.',
      ]),
      materials: JSON.stringify([
        'Einmaleins-Plakat',
        'Karten für "Male-Mal-Mir-Nach"',
      ]),
      homework: 'Einmaleins-Trainingsheft S. 8',
      reflection: 'Die SuS waren sehr motiviert. Besonders die Partnerarbeit hat gut funktioniert. Einige SuS benötigen noch Übung mit dem 7er und 8er Einmaleins.',
      linkedCompetencyIds: JSON.stringify([mathCompZAH03.id]),
    },
  })

  console.log('    Created 4 lesson plans (1 draft, 2 scheduled, 1 completed)')

  // ─── 14. Parent Communication ──────────────────────────────────────
  console.log('  👨‍👩‍👧 Creating parent contacts & messages...')

  // Clean previous parent data (so re-seeding works)
  await prisma.parentMessage.deleteMany()
  await prisma.parentContact.deleteMany()

  // Pick a few students to create parent contacts for
  const parentSeedStudents = [
    students3a[0], // Lena Schmidt
    students3a[1], // Maximilian Weber
    students3a[3], // Felix Fischer
    students3a[5], // Lukas Wagner
    students3b[0], // Hannah Koch
  ]

  const parentContacts: { id: string; firstName: string; lastName: string; studentId: string; studentFirstName: string; studentLastName: string }[] = []

  const contactDefs = [
    { firstName: 'Maria', lastName: 'Schmidt', email: 'maria.schmidt@example.org', phone: '+49 30 12345601', relationship: 'parent', preferredContact: 'email', preferredLanguage: 'de', notes: 'Erreichbar ab 16 Uhr.' },
    { firstName: 'Thomas', lastName: 'Weber', email: 't.weber@example.org', phone: '+49 30 12345602', relationship: 'parent', preferredContact: 'phone', preferredLanguage: 'de', notes: null },
    { firstName: 'Petra', lastName: 'Fischer', email: 'petra.fischer@example.org', phone: '+49 30 12345603', relationship: 'guardian', preferredContact: 'both', preferredLanguage: 'de', notes: 'Großmutter, Haupterziehungsberechtigte.' },
    { firstName: 'Andreas', lastName: 'Wagner', email: 'a.wagner@example.org', phone: '+49 30 12345604', relationship: 'parent', preferredContact: 'email', preferredLanguage: 'en', notes: 'Speaks English at home.' },
    { firstName: 'Julia', lastName: 'Koch', email: 'julia.koch@example.org', phone: '+49 30 12345605', relationship: 'parent', preferredContact: 'email', preferredLanguage: 'de', notes: null },
  ]

  for (let i = 0; i < parentSeedStudents.length; i++) {
    const stu = parentSeedStudents[i]
    const def = contactDefs[i]
    const created = await prisma.parentContact.create({
      data: {
        studentId: stu.id,
        firstName: def.firstName,
        lastName: def.lastName,
        email: def.email,
        phone: def.phone,
        relationship: def.relationship,
        preferredContact: def.preferredContact,
        preferredLanguage: def.preferredLanguage,
        notes: def.notes,
      },
    })
    parentContacts.push({
      id: created.id,
      firstName: created.firstName,
      lastName: created.lastName,
      studentId: stu.id,
      studentFirstName: stu.firstName,
      studentLastName: stu.lastName,
    })
  }

  // Create 8 messages across categories, priorities, statuses
  const now = new Date()

  function daysAgo(days: number, hour = 10, minute = 0): Date {
    const d = new Date(now)
    d.setDate(d.getDate() - days)
    d.setHours(hour, minute, 0, 0)
    return d
  }

  type MsgDef = {
    parentIdx: number
    subject: string
    body: string
    category: string
    priority: string
    status: string
    createdAt: Date
    readAt?: Date
    reply?: string
    replyAt?: Date
  }

  const msgDefs: MsgDef[] = [
    {
      parentIdx: 0,
      subject: 'Positive Rückmeldung zu Lenas Lernfortschritt',
      body: 'Sehr geehrte Frau Schmidt,\n\nich möchte Ihnen eine positive Rückmeldung zu Lenas Lernfortschritt im Fach Mathematik geben. In den letzten Wochen hat sie sich besonders im Bereich der schriftlichen Addition deutlich verbessert. Sie arbeitet konzentriert mit und hilft gerne anderen Kindern.\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'progress',
      priority: 'normal',
      status: 'read',
      createdAt: daysAgo(12, 9, 30),
      readAt: daysAgo(11, 18, 0),
    },
    {
      parentIdx: 0,
      subject: 'Elternsprechtag — Terminvereinbarung',
      body: 'Sehr geehrte Frau Schmidt,\n\nam kommenden Freitag findet der Elternsprechtag statt. Ich würde Sie gerne zu einem Gespräch über Lenas Entwicklung einladen. Bitte melden Sie sich mit einem Wunschtermin.\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'event',
      priority: 'high',
      status: 'replied',
      createdAt: daysAgo(8, 14, 0),
      readAt: daysAgo(8, 19, 30),
      reply: 'Sehr geehrte Frau Müller,\n\nvielen Dank für die Nachricht. Mir würde Freitag um 15:30 Uhr passen.\n\nHerzliche Grüße\nMaria Schmidt',
      replyAt: daysAgo(7, 8, 15),
    },
    {
      parentIdx: 1,
      subject: 'Überprüfung im Fach Deutsch — Erinnerung',
      body: 'Sehr geehrter Herr Weber,\n\nnächste Woche schreiben wir eine kurze Leseverständnis-Überprüfung. Bitte unterstützen Sie Maximilian bei der Vorbereitung, indem Sie mit ihm die Märchen-Lesezeichen durchgehen.\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'assessment',
      priority: 'high',
      status: 'delivered',
      createdAt: daysAgo(4, 8, 0),
    },
    {
      parentIdx: 2,
      subject: 'Verhalten im Unterricht — Gesprächsbedarf',
      body: 'Sehr geehrte Frau Fischer,\n\nin den letzten Tagen ist mir aufgefallen, dass Felix im Unterricht häufiger unaufmerksam war und Mitschüler ablenkte. Ich würde gerne zeitnah ein Gespräch mit Ihnen führen, um gemeinsam zu überlegen, wie wir Felix unterstützen können.\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'behavior',
      priority: 'urgent',
      status: 'sent',
      createdAt: daysAgo(2, 11, 45),
    },
    {
      parentIdx: 2,
      subject: 'Positives Feedback zum Arbeitsverhalten',
      body: 'Sehr geehrte Frau Fischer,\n\nich möchte Ihnen mitteilen, dass Felix in dieser Woche sehr konzentriert gearbeitet hat und die Aufgaben eigenständig gelöst hat. Das ist ein großer Fortschritt!\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'progress',
      priority: 'normal',
      status: 'sent',
      createdAt: daysAgo(1, 9, 15),
    },
    {
      parentIdx: 3,
      subject: 'Anwesenheit — Entschuldigung',
      body: 'Dear Mr. Wagner,\n\nI would like to inform you that Lukas was marked absent yesterday without prior notice. Please send a written excuse at your earliest convenience.\n\nBest regards\nAnna Müller',
      category: 'attendance',
      priority: 'normal',
      status: 'delivered',
      createdAt: daysAgo(3, 13, 0),
    },
    {
      parentIdx: 4,
      subject: 'Schulfest — Mitwirkung der Klasse 3b',
      body: 'Sehr geehrte Frau Koch,\n\nam Ende des Schuljahres findet unser Schulfest statt. Die Klasse 3b wird einen kleinen Beitrag leisten. Ich würde mich freuen, wenn Hannah daran teilnimmt. Nähere Informationen folgen.\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'event',
      priority: 'low',
      status: 'draft',
      createdAt: daysAgo(0, 8, 30),
    },
    {
      parentIdx: 0,
      subject: 'Allgemeine Informationen zur Klassenfahrt',
      body: 'Sehr geehrte Frau Schmidt,\n\nin Vorbereitung auf die Klassenfahrt im nächsten Monat sende ich Ihnen heute die Informationsmappe. Bitte geben Sie das ausgefüllte Anmeldeformular bis nächste Woche ab.\n\nMit freundlichen Grüßen\nAnna Müller',
      category: 'general',
      priority: 'normal',
      status: 'replied',
      createdAt: daysAgo(15, 16, 0),
      readAt: daysAgo(14, 9, 0),
      reply: 'Sehr geehrte Frau Müller,\n\ndas Formular liegt morgen früh in der Mappe bei. Vielen Dank für die Organisation!\n\nHerzliche Grüße\nMaria Schmidt',
      replyAt: daysAgo(14, 17, 30),
    },
  ]

  let msgCount = 0
  for (const def of msgDefs) {
    const pc = parentContacts[def.parentIdx]
    if (!pc) continue
    await prisma.parentMessage.create({
      data: {
        parentId: pc.id,
        teacherId: teacher.id,
        studentId: pc.studentId,
        subject: def.subject,
        body: def.body,
        category: def.category,
        priority: def.priority,
        status: def.status,
        readAt: def.readAt ?? null,
        reply: def.reply ?? null,
        replyAt: def.replyAt ?? null,
        createdAt: def.createdAt,
        updatedAt: def.createdAt,
      },
    })
    msgCount++
  }

  console.log(`    Created ${parentContacts.length} parent contacts and ${msgCount} messages`)

  // ─── 15. Behavior Tracking ─────────────────────────────────────────
  console.log('  🛡️  Creating behavior categories & incidents...')

  // Clean previous behavior data (so re-seeding works)
  await prisma.behaviorIncident.deleteMany()
  await prisma.behaviorCategory.deleteMany()

  const behaviorCategoryDefs = [
    { key: 'helpfulness', name: 'Hilfsbereitschaft', color: '#10b981', valence: 'positive', icon: '🤝' },
    { key: 'participation', name: 'Mitarbeit', color: '#14b8a6', valence: 'positive', icon: '✋' },
    { key: 'disruption', name: 'Störung', color: '#f43f5e', valence: 'negative', icon: '⚠️' },
    { key: 'conflict', name: 'Konflikt', color: '#f59e0b', valence: 'negative', icon: '😡' },
    { key: 'tardiness', name: 'Verspätung', color: '#64748b', valence: 'neutral', icon: '⏰' },
    { key: 'praise', name: 'Lob', color: '#8b5cf6', valence: 'positive', icon: '⭐' },
  ]

  const behaviorCategoryIds: Record<string, string> = {}
  for (const def of behaviorCategoryDefs) {
    const created = await prisma.behaviorCategory.create({
      data: {
        schoolId: school.id,
        name: def.name,
        color: def.color,
        valence: def.valence,
        icon: def.icon,
      },
    })
    behaviorCategoryIds[def.key] = created.id
  }
  console.log(`    Created ${behaviorCategoryDefs.length} behavior categories`)

  // Pick 4 target students across the two classes
  const behaviorTargetStudents = [
    students3a[0], // Lena Schmidt
    students3a[1], // Maximilian Weber
    students3a[3], // Felix Fischer
    students3b[0], // Hannah Koch
  ]

  // Behavior incident definitions — mix of categories, severities, locations, follow-ups, resolved status
  type IncidentDef = {
    studentIdx: number
    categoryId: string
    classGroupId: string
    daysAgo: number
    hour: number
    severity: 'minor' | 'moderate' | 'major'
    description: string
    location: string
    followUpAction: string | null
    resolved: boolean
    resolvedDaysAgo?: number
  }

  const incidentDefs: IncidentDef[] = [
    {
      studentIdx: 0,
      categoryId: behaviorCategoryIds.praise,
      classGroupId: class3a.id,
      daysAgo: 2,
      hour: 9,
      severity: 'minor',
      description: 'Lena hat heute einer Mitschülerin beim Aufräumen geholfen, ohne darum gebeten zu werden.',
      location: 'classroom',
      followUpAction: 'praise_circle',
      resolved: true,
      resolvedDaysAgo: 1,
    },
    {
      studentIdx: 1,
      categoryId: behaviorCategoryIds.disruption,
      classGroupId: class3a.id,
      daysAgo: 5,
      hour: 10,
      severity: 'moderate',
      description: 'Maximilian hat den Unterricht mehrfach durch laute Bemerkungen unterbrochen und Mitschüler abgelenkt.',
      location: 'classroom',
      followUpAction: 'warning',
      resolved: false,
    },
    {
      studentIdx: 1,
      categoryId: behaviorCategoryIds.tardiness,
      classGroupId: class3a.id,
      daysAgo: 7,
      hour: 8,
      severity: 'minor',
      description: 'Maximilian kam 10 Minuten zu spät zum Unterricht.',
      location: 'classroom',
      followUpAction: null,
      resolved: true,
      resolvedDaysAgo: 6,
    },
    {
      studentIdx: 2,
      categoryId: behaviorCategoryIds.conflict,
      classGroupId: class3a.id,
      daysAgo: 10,
      hour: 11,
      severity: 'major',
      description: 'Felix hat sich in der Pause mit einem Mitschüler gestritten und ihn geschubst. Ein Elterngespräch ist erforderlich.',
      location: 'playground',
      followUpAction: 'parent_talk',
      resolved: false,
    },
    {
      studentIdx: 2,
      categoryId: behaviorCategoryIds.disruption,
      classGroupId: class3a.id,
      daysAgo: 12,
      hour: 9,
      severity: 'moderate',
      description: 'Felix hat während der Stillarbeit mehrfach Bücher geklatscht und andere Kinder gestört.',
      location: 'classroom',
      followUpAction: 'warning',
      resolved: true,
      resolvedDaysAgo: 11,
    },
    {
      studentIdx: 2,
      categoryId: behaviorCategoryIds.helpfulness,
      classGroupId: class3a.id,
      daysAgo: 3,
      hour: 10,
      severity: 'minor',
      description: 'Felix hat einer neuen Schülerin die Schulwege gezeigt und sie in die Klassengemeinschaft integriert.',
      location: 'hallway',
      followUpAction: 'praise_circle',
      resolved: true,
      resolvedDaysAgo: 2,
    },
    {
      studentIdx: 0,
      categoryId: behaviorCategoryIds.participation,
      classGroupId: class3a.id,
      daysAgo: 1,
      hour: 9,
      severity: 'minor',
      description: 'Lena hat sich im Sachunterricht besonders aktiv gemeldet und ein Referat vorbereitet.',
      location: 'classroom',
      followUpAction: 'prize',
      resolved: false,
    },
    {
      studentIdx: 3,
      categoryId: behaviorCategoryIds.praise,
      classGroupId: class3b.id,
      daysAgo: 4,
      hour: 11,
      severity: 'minor',
      description: 'Hannah hat beim Lesen einer Mitschülerin geduldig geholfen und ihr Mut zugesprochen.',
      location: 'library',
      followUpAction: 'praise_circle',
      resolved: true,
      resolvedDaysAgo: 3,
    },
    {
      studentIdx: 3,
      categoryId: behaviorCategoryIds.tardiness,
      classGroupId: class3b.id,
      daysAgo: 8,
      hour: 8,
      severity: 'minor',
      description: 'Hannah kam nach der großen Pause 5 Minuten zu spät zurück in den Unterricht.',
      location: 'playground',
      followUpAction: null,
      resolved: true,
      resolvedDaysAgo: 7,
    },
    {
      studentIdx: 1,
      categoryId: behaviorCategoryIds.participation,
      classGroupId: class3a.id,
      daysAgo: 14,
      hour: 10,
      severity: 'moderate',
      description: 'Maximilian hat im Mathematikunterricht eine schwierige Aufgabe an der Tafel eigenständig gelöst und sein Vorgehen der Klasse erklärt.',
      location: 'classroom',
      followUpAction: 'prize',
      resolved: true,
      resolvedDaysAgo: 13,
    },
  ]

  let incidentCount = 0
  for (const def of incidentDefs) {
    const stu = behaviorTargetStudents[def.studentIdx]
    if (!stu) continue
    const date = new Date(now)
    date.setDate(date.getDate() - def.daysAgo)
    date.setHours(def.hour, 0, 0, 0)
    const resolvedAt = def.resolved && def.resolvedDaysAgo !== undefined ? new Date(now.getTime() - def.resolvedDaysAgo * 24 * 60 * 60 * 1000) : null
    await prisma.behaviorIncident.create({
      data: {
        studentId: stu.id,
        teacherId: teacher.id,
        classGroupId: def.classGroupId,
        schoolId: school.id,
        categoryId: def.categoryId,
        date,
        severity: def.severity,
        description: def.description,
        location: def.location,
        followUpAction: def.followUpAction,
        resolved: def.resolved,
        resolvedAt,
        resolvedById: def.resolved ? teacher.id : null,
      },
    })
    incidentCount++
  }
  console.log(`    Created ${incidentCount} behavior incidents`)

  // ─── 16. Rubric Library ────────────────────────────────────────────────
  console.log('  📋 Creating rubrics...')

  // Rubric 1: Aufsatzbewertung Deutsch (ANALYTIC)
  const rubric1 = await prisma.rubric.create({
    data: {
      schoolId: school.id,
      teacherId: teacher.id,
      subjectId: germanSubject.id,
      title: 'Aufsatzbewertung Deutsch',
      description: 'Bewertungsraster für schriftliche Aufsätze in der Grundschule',
      type: 'ANALYTIC',
      maxPoints: 60,
      isPublic: true,
      version: 1,
      criteria: {
        create: [
          {
            name: 'Inhalt',
            description: 'Inhaltliche Qualität und Gedankenführung',
            weight: 2.0,
            maxPoints: 20,
            order: 0,
            levels: {
              create: [
                { label: 'Sehr gut', description: 'Der Text ist inhaltlich sehr reichhaltig, gut strukturiert und zeigt eigene Gedanken.', points: 20, order: 0 },
                { label: 'Gut', description: 'Der Text ist inhaltlich angemessen, gut nachvollziehbar und zeigt Ansätze eigener Gedanken.', points: 16, order: 1 },
                { label: 'Befriedigend', description: 'Der Text ist inhaltlich verständlich, aber eher oberflächlich und wenig eigenständig.', points: 11, order: 2 },
                { label: 'Ausreichend', description: 'Der Text ist inhaltlich dürftig, schwer nachvollziehbar und ohne eigene Gedanken.', points: 6, order: 3 },
              ],
            },
          },
          {
            name: 'Sprache',
            description: 'Sprachliche Richtigkeit und Ausdrucksfähigkeit',
            weight: 2.0,
            maxPoints: 20,
            order: 1,
            levels: {
              create: [
                { label: 'Sehr gut', description: 'Sehr fehlerfreie Sprache, treffender Ausdruck, abwechslungsreiche Sätze.', points: 20, order: 0 },
                { label: 'Gut', description: 'Wenige Fehler, guter Ausdruck, überwiegend abwechslungsreiche Sätze.', points: 16, order: 1 },
                { label: 'Befriedigend', description: 'Einige Fehler, einfacher Ausdruck, ähnliche Satzstrukturen.', points: 11, order: 2 },
                { label: 'Ausreichend', description: 'Viele Fehler, eingeschränkter Ausdruck, sehr einfache Sätze.', points: 6, order: 3 },
              ],
            },
          },
          {
            name: 'Darstellung',
            description: 'Äußere Form, Übersichtlichkeit und Lesbarkeit',
            weight: 1.0,
            maxPoints: 20,
            order: 2,
            levels: {
              create: [
                { label: 'Sehr gut', description: 'Sehr übersichtlich, saubere Schrift, klare Absatzstruktur.', points: 20, order: 0 },
                { label: 'Gut', description: 'Übersichtlich, gut lesbar, angemessene Absatzstruktur.', points: 16, order: 1 },
                { label: 'Befriedigend', description: 'Eher unübersichtlich, noch lesbar, unklare Absatzstruktur.', points: 11, order: 2 },
                { label: 'Ausreichend', description: 'Unübersichtlich, schwer lesbar, keine Absatzstruktur.', points: 6, order: 3 },
              ],
            },
          },
        ],
      },
    },
  })

  // Rubric 2: Mündliche Prüfung Mathe (ANALYTIC)
  const rubric2 = await prisma.rubric.create({
    data: {
      schoolId: school.id,
      teacherId: teacher.id,
      subjectId: mathSubject.id,
      title: 'Mündliche Prüfung Mathe',
      description: 'Bewertungsraster für mündliche Mathematikprüfungen',
      type: 'ANALYTIC',
      maxPoints: 40,
      isPublic: true,
      version: 1,
      criteria: {
        create: [
          {
            name: 'Fachwissen',
            description: 'Beherrschung mathematischer Begriffe und Verfahren',
            weight: 2.0,
            maxPoints: 20,
            order: 0,
            levels: {
              create: [
                { label: 'Sehr gut', description: 'Sichere Beherrschung aller Fachbegriffe, kann Verfahren selbstständig erklären.', points: 20, order: 0 },
                { label: 'Gut', description: 'Gute Beherrschung der Fachbegriffe, kann Verfahren mit Hilfestellung erklären.', points: 16, order: 1 },
                { label: 'Befriedigend', description: 'Grundlegende Fachbegriffe bekannt, Erklärungen sind lückenhaft.', points: 11, order: 2 },
                { label: 'Ausreichend', description: 'Wenige Fachbegriffe bekannt, keine zusammenhängenden Erklärungen möglich.', points: 6, order: 3 },
              ],
            },
          },
          {
            name: 'Problemlösung',
            description: 'Fähigkeit, mathematische Probleme selbstständig zu lösen',
            weight: 2.0,
            maxPoints: 20,
            order: 1,
            levels: {
              create: [
                { label: 'Sehr gut', description: 'Löst Probleme selbstständig und findet eigene Lösungswege.', points: 20, order: 0 },
                { label: 'Gut', description: 'Löst Probleme mit wenig Hilfestellung, findet angemessene Lösungswege.', points: 16, order: 1 },
                { label: 'Befriedigend', description: 'Löst Probleme nur mit Hilfestellung, Lösungswege sind nachvollziehbar.', points: 11, order: 2 },
                { label: 'Ausreichend', description: 'Kann Probleme auch mit Hilfestellung kaum lösen.', points: 6, order: 3 },
              ],
            },
          },
        ],
      },
    },
  })

  // Rubric 3: Projektpräsentation (HOLISTIC)
  const rubric3 = await prisma.rubric.create({
    data: {
      schoolId: school.id,
      teacherId: teacher.id,
      subjectId: null,
      title: 'Projektpräsentation',
      description: 'Ganzheitliche Bewertung von Projektpräsentationen',
      type: 'HOLISTIC',
      maxPoints: 15,
      isPublic: false,
      version: 1,
      criteria: {
        create: [
          {
            name: 'Gesamteindruck',
            description: 'Gesamteindruck der Präsentation inklusive Inhalt, Vortrag und Visualisierung',
            weight: 1.0,
            maxPoints: 15,
            order: 0,
            levels: {
              create: [
                { label: 'Sehr gut', description: 'Hervorragende Präsentation mit klarer Struktur, überzeugendem Vortrag und ansprechender Visualisierung.', points: 15, order: 0 },
                { label: 'Gut', description: 'Gute Präsentation mit erkennbarer Struktur, solidem Vortrag und angemessener Visualisierung.', points: 12, order: 1 },
                { label: 'Befriedigend', description: 'Ausreichende Präsentation mit Schwächen in Struktur, Vortrag oder Visualisierung.', points: 8, order: 2 },
                { label: 'Ausreichend', description: 'Schwache Präsentation mit deutlichen Mängeln in Struktur, Vortrag und Visualisierung.', points: 5, order: 3 },
              ],
            },
          },
        ],
      },
    },
  })

  console.log(`    Created 3 rubrics: Aufsatzbewertung Deutsch, Mündliche Prüfung Mathe, Projektpräsentation`)

  // ─── 16. Comment Categories & Bank Entries ────────────────────────────
  console.log('  💬 Creating comment categories and bank entries...')

  const commentCatSozial = await prisma.commentCategory.create({
    data: { schoolId: school.id, name: 'Sozialverhalten', color: '#10b981', icon: '🤝' },
  })
  const commentCatArbeit = await prisma.commentCategory.create({
    data: { schoolId: school.id, name: 'Arbeitsverhalten', color: '#14b8a6', icon: '✋' },
  })
  const commentCatFach = await prisma.commentCategory.create({
    data: { schoolId: school.id, name: 'Fachliche Kompetenz', color: '#f59e0b', icon: '📚' },
  })
  const commentCatMotiv = await prisma.commentCategory.create({
    data: { schoolId: school.id, name: 'Motivation', color: '#8b5cf6', icon: '💪' },
  })
  const commentCatGesamt = await prisma.commentCategory.create({
    data: { schoolId: school.id, name: 'Gesamteindruck', color: '#f43f5e', icon: '⭐' },
  })

  const commentEntries = [
    { cat: commentCatSozial, title: 'Aktive Mitarbeit', text: 'X beteiligt sich aktiv und konstruktiv am Unterrichtsgeschehen.', subjectId: null, gradeLevel: 'all', isPublic: true, usageCount: 12, tags: 'sozial,mitarbeit,aktiv' },
    { cat: commentCatSozial, title: 'Hilfsbereitschaft', text: 'X zeigt große Hilfsbereitschaft gegenüber Mitschülern und unterstützt andere gerne.', subjectId: null, gradeLevel: 'all', isPublic: true, usageCount: 8, tags: 'sozial,hilfe,team' },
    { cat: commentCatSozial, title: 'Respektvoller Umgang', text: 'X geht respektvoll und rücksichtsvoll mit anderen um.', subjectId: null, gradeLevel: 'all', isPublic: false, usageCount: 5, tags: 'sozial,respekt' },
    { cat: commentCatArbeit, title: 'Zuverlässige Hausaufgaben', text: 'X erledigt die Hausaufgaben regelmäßig und sorgfältig.', subjectId: null, gradeLevel: '3-4', isPublic: true, usageCount: 15, tags: 'arbeit,hausaufgaben,zuverlässig' },
    { cat: commentCatArbeit, title: 'Sorgfältiges Arbeiten', text: 'X arbeitet konzentriert und sorgfältig an den gestellten Aufgaben.', subjectId: null, gradeLevel: 'all', isPublic: true, usageCount: 10, tags: 'arbeit,konzentration,sorgfalt' },
    { cat: commentCatArbeit, title: 'Selbstständige Organisation', text: 'X kann Arbeitsmaterialien selbstständig organisieren und den Arbeitsplatz ordentlich halten.', subjectId: null, gradeLevel: '3', isPublic: false, usageCount: 3, tags: 'arbeit,organisation' },
    { cat: commentCatFach, title: 'Gute Lesekompetenz', text: 'X liest flüssig und versteht auch komplexe Texte.', subjectId: germanSubject.id, gradeLevel: '3-4', isPublic: true, usageCount: 9, tags: 'fach,lesen,deutsch' },
    { cat: commentCatFach, title: 'Sicheres Rechnen', text: 'X beherrscht die Grundrechenarten sicher und kann sie in Sachaufgaben anwenden.', subjectId: mathSubject.id, gradeLevel: '3', isPublic: true, usageCount: 7, tags: 'fach,rechnen,mathe' },
    { cat: commentCatFach, title: 'Gute Schreibkompetenz', text: 'X verfasst strukturierte und verständliche Texte mit angemessenem Wortschatz.', subjectId: germanSubject.id, gradeLevel: '3-4', isPublic: false, usageCount: 6, tags: 'fach,schreiben,deutsch' },
    { cat: commentCatMotiv, title: 'Hohe Motivation', text: 'X zeigt große Begeisterung und Engagement im Unterricht.', subjectId: null, gradeLevel: 'all', isPublic: true, usageCount: 11, tags: 'motivation,engagement' },
    { cat: commentCatMotiv, title: 'Neugier und Lernfreude', text: 'X ist neugierig und zeigt Freude am Lernen neuer Inhalte.', subjectId: null, gradeLevel: 'all', isPublic: false, usageCount: 4, tags: 'motivation,neugier,lernfreude' },
    { cat: commentCatGesamt, title: 'Positiver Gesamteindruck', text: 'X hat sich in diesem Schuljahr insgesamt sehr positiv entwickelt und ist eine Bereicherung für die Klasse.', subjectId: null, gradeLevel: 'all', isPublic: true, usageCount: 14, tags: 'gesamt,positiv,entwicklung' },
  ]

  for (const ce of commentEntries) {
    await prisma.commentBankEntry.create({
      data: {
        schoolId: school.id,
        teacherId: teacher.id,
        categoryId: ce.cat.id,
        subjectId: ce.subjectId,
        title: ce.title,
        text: ce.text,
        gradeLevel: ce.gradeLevel,
        schoolType: 'ELEMENTARY',
        isPublic: ce.isPublic,
        usageCount: ce.usageCount,
        tags: ce.tags,
      },
    })
  }

  console.log(`    Created 5 comment categories, 12 comment bank entries`)

  // ─── Summary ───────────────────────────────────────────────────────────
  console.log('\n  ✅ Seed completed successfully!\n')
  console.log('  📊 Summary:')
  console.log('  ─────────────────────────────────────────')
  console.log(`  School:       ${school.name}`)
  console.log(`  School Year:  ${schoolYear.label}`)
  console.log(`  Teacher:      ${teacher.firstName} ${teacher.lastName} (${teacher.email})`)
  console.log(`  Classes:      3a (8 students), 3b (7 students)`)
  console.log(`  Students:     ${students3a.length + students3b.length} total`)
  console.log(`  Subjects:     Mathematik, Deutsch`)
  console.log(`  Templates:    Mathematik Klasse 3, Deutsch Klasse 3`)
  console.log(`  Categories:   6 (3 Math + 3 German)`)
  console.log(`  Competencies: ${mathCompetencies.length + germanCompetencies.length} (7 Math + 7 German)`)
  console.log(`  Progress:     ${progressCount} entries`)
  console.log(`  Assessment:   1 with ${students3a.length} results`)
  console.log(`  Grading:      1 scheme (Noten 1-6)`)
  console.log(`  Audit Logs:   ${auditEntries.length}`)
  console.log(`  Parent Contacts: ${parentContacts.length}, Parent Messages: ${msgCount}`)
  console.log(`  Behavior:     ${behaviorCategoryDefs.length} categories, ${incidentCount} incidents`)
  console.log(`  Rubrics:      3 (Aufsatzbewertung, Mündliche Prüfung, Projektpräsentation)`)
  console.log(`  Comments:     5 categories, 12 bank entries`)
  console.log('  ─────────────────────────────────────────')
  console.log('\n  🔑 Login: demo@competencetrack.org / Demo2025!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
