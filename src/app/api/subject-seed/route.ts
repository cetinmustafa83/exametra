import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limit';

// Schlaukopf.de content structure for Gymnasium
const SCHLAUKOPF_CATEGORIES = [
  { name: 'Klasse 5', slug: 'klasse5', icon: 'GraduationCap', sortOrder: 0 },
  { name: 'Klasse 6', slug: 'klasse6', icon: 'GraduationCap', sortOrder: 1 },
  { name: 'Klasse 7', slug: 'klasse7', icon: 'GraduationCap', sortOrder: 2 },
  { name: 'Klasse 8', slug: 'klasse8', icon: 'GraduationCap', sortOrder: 3 },
  { name: 'Klasse 9', slug: 'klasse9', icon: 'GraduationCap', sortOrder: 4 },
  { name: 'Klasse 10', slug: 'klasse10', icon: 'GraduationCap', sortOrder: 5 },
  { name: 'Oberstufe', slug: 'oberstufe', icon: 'Award', sortOrder: 6 },
];

const SUBJECTS_BY_CLASS: Record<string, Array<{ name: string; slug: string; icon: string; topics: string[] }>> = {
  'klasse5': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Grundwissen', 'Natuerliche Zahlen', 'Brueche', 'Geometrie', 'Groessen', 'Terme'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Grammatik', 'Rechtschreibung', 'Wortarten', 'Satzarten', 'Aufsatz', 'Lesen'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Vocabulary', 'Grammar', 'Tenses', 'Reading', 'Listening'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Vokabeln', 'Grammatik', 'Konjugation', 'Lesen'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Lebewesen', 'Zellen', 'Mensch', 'Pflanzen', 'Tiere'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Sonnensystem', 'Deutschland', 'Europa', 'Klima'] },
    { name: 'Musik', slug: 'musik', icon: 'Music', topics: ['Noten', 'Intervalle', 'Rhythmus', 'Instrumente'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['Fruehgeschichte', 'Aegypten', 'Griechenland', 'Roemer'] },
    { name: 'Natur und Technik', slug: 'natur-und-technik', icon: 'Zap', topics: ['Akustik', 'Licht', 'Magnetismus', 'Elektrizitaet'] },
    { name: 'Ethik und Religion', slug: 'ethik', icon: 'Heart', topics: ['Werte', 'Religionen', 'Ethik', 'Philosophie'] },
    { name: 'Latein', slug: 'latein', icon: 'BookOpen', topics: ['Vokabeln', 'Grammatik', 'Uebersetzung', 'Kultur'] },
  ],
  'klasse6': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Bruchrechnung', 'Dezimalzahlen', 'Geometrie', 'Gleichungen', 'Proportionalitaet'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Grammatik', 'Rechtschreibung', 'Epik', 'Lyrik', 'Medien'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Vocabulary', 'Grammar', 'Tenses', 'Writing', 'Speaking'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Vokabeln', 'Grammatik', 'Passe Compose', 'Lesen'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Oekologie', 'Evolution', 'Sinnesorgane', 'Fortbewegung'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Naturgefaehrdungen', 'Wirtschaft', 'Bevoelkerung', 'Globalisierung'] },
    { name: 'Musik', slug: 'musik', icon: 'Music', topics: ['Tonleiter', 'Akkorde', 'Musikgeschichte', 'Komponisten'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['Mittelalter', 'Kreuzzuege', 'Kloster', 'Ritter'] },
    { name: 'Natur und Technik', slug: 'natur-und-technik', icon: 'Zap', topics: ['Optik', 'Mechanik', 'Stoffe', 'Geraete'] },
    { name: 'Ethik und Religion', slug: 'ethik', icon: 'Heart', topics: ['Moral', 'Gerechtigkeit', 'Freiheit', 'Verantwortung'] },
    { name: 'Latein', slug: 'latein', icon: 'BookOpen', topics: ['Vokabeln', 'Grammatik', 'Ablativ', 'Kultur'] },
  ],
  'klasse7': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Terme', 'Gleichungen', 'Prozentrechnung', 'Statistik', 'Geometrie'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Grammatik', 'Literatur', 'Sachtexte', 'Schreiben', 'Rhetorik'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Vocabulary', 'Grammar', 'Tenses', 'Literature', 'Debate'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Vokabeln', 'Grammatik', 'Subjonctif', 'Landeskunde'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Genetik', 'Zellteilung', 'Stoffwechsel', 'Nervensystem'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Nordamerika', 'Suedamerika', 'Asien', 'Klimawandel'] },
    { name: 'Musik', slug: 'musik', icon: 'Music', topics: ['Musikformen', 'Jazz', 'Pop', 'Filmmusik'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['Entdeckungen', 'Reformation', 'Dreissigjaehriger Krieg', 'Aufklaerung'] },
    { name: 'Natur und Technik', slug: 'natur-und-technik', icon: 'Zap', topics: ['Chemie', 'Elektrizitaet', 'Kraefte', 'Energie'] },
    { name: 'Ethik und Religion', slug: 'ethik', icon: 'Heart', topics: ['Menschenwuerde', 'Toleranz', 'Konflikte', 'Frieden'] },
    { name: 'Latein', slug: 'latein', icon: 'BookOpen', topics: ['Vokabeln', 'Konjunktiv', 'Caesar', 'Kultur'] },
  ],
  'klasse8': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Quadratische Gleichungen', 'Funktionen', 'Satz des Pythagoras', 'Wahrscheinlichkeit', 'Aehnlichkeit'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Dramatik', 'Lyrik', 'Epik', 'Medien', 'Kommunikation'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Vocabulary', 'Grammar', 'Conditionals', 'Reported Speech', 'Writing'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Vokabeln', 'Grammatik', 'Conditionnel', 'Frankophone'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Immunsystem', 'Hormone', 'Evolution', 'Verhaltensbiologie'] },
    { name: 'Physik', slug: 'physik', icon: 'Zap', topics: ['Mechanik', 'Elektrizitaet', 'Optik', 'Akustik'] },
    { name: 'Chemie', slug: 'chemie', icon: 'FlaskConical', topics: ['Atombau', 'Periodensystem', 'Bindungen', 'Reaktionen'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['Industrielle Revolution', 'Imperialismus', 'Erster Weltkrieg', 'Weimarer Republik'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Afrika', 'Australien', 'Polarregionen', 'Nachhaltigkeit'] },
    { name: 'Ethik und Religion', slug: 'ethik', icon: 'Heart', topics: ['Ethik der Technik', 'Bioethik', 'Medienethik', 'Weltethos'] },
    { name: 'Latein', slug: 'latein', icon: 'BookOpen', topics: ['Vokabeln', 'Partizip', 'Cicero', 'Kultur'] },
  ],
  'klasse9': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Analysis', 'Trigonometrie', 'Stochastik', 'Vektorrechnung', 'Funktionen'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Literaturgeschichte', 'Expressionismus', 'Kurzgeschichten', 'Sachtexte', 'Rhetorik'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Vocabulary', 'Grammar', 'Shakespeare', 'Debate', 'Writing'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Vokabeln', 'Grammatik', 'Literatur', 'Zivilisation'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Neurobiologie', 'Oekologie', 'Gentechnik', 'Evolution'] },
    { name: 'Physik', slug: 'physik', icon: 'Zap', topics: ['Elektromagnetismus', 'Kernphysik', 'Mechanik', 'Quantenphysik'] },
    { name: 'Chemie', slug: 'chemie', icon: 'FlaskConical', topics: ['Organische Chemie', 'Saeuren', 'Redoxreaktionen', 'Analytik'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['Nationalsozialismus', 'Zweiter Weltkrieg', 'Holocaust', 'Nachkriegszeit'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Europa', 'Globalisierung', 'Migration', 'Wirtschaftsgeografie'] },
    { name: 'Ethik und Religion', slug: 'ethik', icon: 'Heart', topics: ['Existenzphilosophie', 'Politische Ethik', 'Recht', 'Gerechtigkeit'] },
    { name: 'Latein', slug: 'latein', icon: 'BookOpen', topics: ['Vokabeln', 'Uebersetzung', 'Ovid', 'Kultur'] },
  ],
  'klasse10': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Analysis', 'Wahrscheinlichkeit', 'Vektorrechnung', 'Kurven', 'Grenzwerte'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Literatur', 'Klassik', 'Romantik', 'Gegenwartsliteratur', 'Erörterung'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Vocabulary', 'Grammar', 'Literature', 'Creative Writing', 'Presentations'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Vokabeln', 'Grammatik', 'Literatur', 'Film'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Genetik', 'Immunologie', 'Verhaltensforschung', 'Oekologie'] },
    { name: 'Physik', slug: 'physik', icon: 'Zap', topics: ['Relativitaetstheorie', 'Quantenphysik', 'Astrophysik', 'Technik'] },
    { name: 'Chemie', slug: 'chemie', icon: 'FlaskConical', topics: ['Polymerchemie', 'Umweltchemie', 'Biochemie', 'Labor'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['Kalter Krieg', 'Deutsche Teilung', 'Wiedervereinigung', 'Europa'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Deutschland', 'Raumplanung', 'Entwicklung', 'Ressourcen'] },
    { name: 'Ethik und Religion', slug: 'ethik', icon: 'Heart', topics: ['Ethik der Zukunft', 'Kuenstliche Intelligenz', 'Nachhaltigkeit', 'Weltreligionen'] },
    { name: 'Informatik', slug: 'informatik', icon: 'Code', topics: ['Programmierung', 'Algorithmen', 'Datenbanken', 'Netzwerke'] },
  ],
  'oberstufe': [
    { name: 'Mathematik', slug: 'mathematik', icon: 'Calculator', topics: ['Analysis', 'Lineare Algebra', 'Stochastik', 'Analytische Geometrie'] },
    { name: 'Deutsch', slug: 'deutsch', icon: 'BookOpen', topics: ['Literatur', 'Sprache', 'Medien', 'Kommunikation'] },
    { name: 'Englisch', slug: 'englisch', icon: 'Globe', topics: ['Literature', 'Linguistics', 'Cultural Studies', 'Academic Writing'] },
    { name: 'Franzoesisch', slug: 'franzoesisch', icon: 'Globe', topics: ['Literature', 'Civilisation', 'Grammaire', 'Expression'] },
    { name: 'Biologie', slug: 'biologie', icon: 'FlaskConical', topics: ['Molekularbiologie', 'Neurobiologie', 'Oekologie', 'Evolution'] },
    { name: 'Physik', slug: 'physik', icon: 'Zap', topics: ['Mechanik', 'Elektrodynamik', 'Thermodynamik', 'Quantenphysik'] },
    { name: 'Chemie', slug: 'chemie', icon: 'FlaskConical', topics: ['Organische Chemie', 'Physikalische Chemie', 'Analytik', 'Umwelt'] },
    { name: 'Geschichte', slug: 'geschichte', icon: 'History', topics: ['20. Jahrhundert', 'Globalgeschichte', 'Erinnerungskultur', 'Quellenanalyse'] },
    { name: 'Geografie', slug: 'geografie', icon: 'Map', topics: ['Globalisierung', 'Klimawandel', 'Urbanisierung', 'Geoinformatik'] },
    { name: 'Informatik', slug: 'informatik', icon: 'Code', topics: ['Objektorientierung', 'Datenstrukturen', 'Datenbanken', 'Theoretische Informatik'] },
    { name: 'Wirtschaft', slug: 'wirtschaft', icon: 'TrendingUp', topics: ['Volkswirtschaft', 'Betriebswirtschaft', 'Finanzen', 'Markt'] },
    { name: 'Kunst', slug: 'kunst', icon: 'Palette', topics: ['Kunstgeschichte', 'Malerei', 'Skulptur', 'Neue Medien'] },
    { name: 'Sport', slug: 'sport', icon: 'Dumbbell', topics: ['Trainingslehre', 'Sportpsychologie', 'Bewegungsanalyse', 'Gesundheit'] },
  ],
};

// ── POST: Seed subject categories and content ──
async function seedData(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (
      session.user.role !== 'SCHOOL_ADMIN' &&
      session.user.role !== 'VICE_PRINCIPAL' &&
      session.user.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'User must belong to a school' }, { status: 400 });
    }

    let categoriesCreated = 0;
    let contentsCreated = 0;

    // Create categories
    for (const catData of SCHLAUKOPF_CATEGORIES) {
      const existing = await db.subjectCategory.findFirst({
        where: { schoolId, slug: catData.slug },
      });

      if (existing) continue;

      const category = await db.subjectCategory.create({
        data: {
          schoolId,
          name: catData.name,
          slug: catData.slug,
          icon: catData.icon,
          sortOrder: catData.sortOrder,
        },
      });

      categoriesCreated++;

      // Create subjects and topics for this class
      const subjects = SUBJECTS_BY_CLASS[catData.slug] || [];
      for (const subj of subjects) {
        // Check if subject already exists
        const existingContent = await db.subjectContent.findFirst({
          where: { schoolId, categoryId: category.id, slug: subj.slug },
        });

        if (existingContent) continue;

        // Create the subject content
        const subjectContent = await db.subjectContent.create({
          data: {
            schoolId,
            categoryId: category.id,
            title: subj.name,
            slug: subj.slug,
            icon: subj.icon,
            contentType: 'topic',
            sortOrder: subjects.indexOf(subj),
            isActive: true,
            isPublic: true,
          },
        });

        contentsCreated++;

        // Create subtopics
        for (let i = 0; i < subj.topics.length; i++) {
          const topicName = subj.topics[i];
          const topicSlug = `${subj.slug}-${topicName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

          const existingTopic = await db.subjectContent.findFirst({
            where: { schoolId, slug: topicSlug, parentId: subjectContent.id },
          });

          if (existingTopic) continue;

          await db.subjectContent.create({
            data: {
              schoolId,
              categoryId: category.id,
              parentId: subjectContent.id,
              title: topicName,
              slug: topicSlug,
              contentType: 'topic',
              sortOrder: i,
              isActive: true,
              isPublic: true,
              questionCount: Math.floor(Math.random() * 20) + 5,
            },
          });

          contentsCreated++;
        }
      }
    }

    // Ensure AI settings exist
    const existingSettings = await db.aISettings.findUnique({ where: { schoolId } });
    if (!existingSettings) {
      await db.aISettings.create({ data: { schoolId } });
    }

    return NextResponse.json({
      success: true,
      categoriesCreated,
      contentsCreated,
      message: `Created ${categoriesCreated} categories and ${contentsCreated} content items`,
    });
  } catch (error) {
    console.error('Subject seed POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const POST = withRateLimit(seedData, 'dataWrite');
