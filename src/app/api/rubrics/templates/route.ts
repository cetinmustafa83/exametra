import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

interface RubricTemplateCriterion {
  name: string;
  description: string;
  weight: number;
  maxPoints: number;
  levels: Array<{ label: string; description: string; points: number }>;
}

interface RubricTemplate {
  id: string;
  title: string;
  description: string;
  subject: string;
  type: 'ANALYTIC' | 'HOLISTIC';
  maxPoints: number;
  criteria: RubricTemplateCriterion[];
}

const TEMPLATES: RubricTemplate[] = [
  {
    id: 'math-assessment',
    title: 'Mathematik — Klassenarbeit',
    description: 'Bewertungsraster für Mathematik-Klassenarbeiten (Klasse 3-6)',
    subject: 'Mathematik',
    type: 'ANALYTIC',
    maxPoints: 100,
    criteria: [
      {
        name: 'Inhalt / Fachwissen',
        description: 'Korrektheit der mathematischen Inhalte und Verfahren',
        weight: 2.0,
        maxPoints: 40,
        levels: [
          { label: 'Sehr gut', description: 'Fachliche Inhalte vollständig und korrekt dargestellt', points: 40 },
          { label: 'Gut', description: 'Fachliche Inhalte weitgehend korrekt, kleinere Fehler', points: 32 },
          { label: 'Befriedigend', description: 'Grundlegende Inhalte erkannt, einige Verständnislücken', points: 24 },
          { label: 'Ausreichend', description: 'Nur grundlegende Ansätze erkennbar', points: 16 },
        ],
      },
      {
        name: 'Rechenweg / Darstellung',
        description: 'Nachvollziehbarkeit und Übersichtlichkeit des Rechenwegs',
        weight: 1.5,
        maxPoints: 30,
        levels: [
          { label: 'Sehr gut', description: 'Rechenweg vollständig, klar strukturiert und nachvollziehbar', points: 30 },
          { label: 'Gut', description: 'Rechenweg nachvollziehbar, kleinere Darstellungsmängel', points: 24 },
          { label: 'Befriedigend', description: 'Rechenweg teilweise erkennbar, Lücken vorhanden', points: 18 },
          { label: 'Ausreichend', description: 'Rechenweg kaum erkennbar', points: 12 },
        ],
      },
      {
        name: 'Problemlösekompetenz',
        description: 'Fähigkeit, mathematische Probleme selbstständig zu lösen',
        weight: 1.0,
        maxPoints: 20,
        levels: [
          { label: 'Sehr gut', description: 'Probleme selbstständig und kreativ gelöst', points: 20 },
          { label: 'Gut', description: 'Probleme überwiegend selbstständig gelöst', points: 16 },
          { label: 'Befriedigend', description: 'Probleme mit Hilfestellung gelöst', points: 12 },
          { label: 'Ausreichend', description: 'Probleme nur mit starker Hilfe lösbar', points: 8 },
        ],
      },
      {
        name: 'Formale Korrektheit',
        description: 'Einheiten, Vorzeichen, Tippfehler',
        weight: 0.5,
        maxPoints: 10,
        levels: [
          { label: 'Sehr gut', description: 'Kaum formale Fehler', points: 10 },
          { label: 'Gut', description: 'Wenige formale Fehler', points: 8 },
          { label: 'Befriedigend', description: 'Einige formale Fehler', points: 6 },
          { label: 'Ausreichend', description: 'Viele formale Fehler', points: 4 },
        ],
      },
    ],
  },
  {
    id: 'german-essay',
    title: 'Deutsch — Aufsichtsarbeit',
    description: 'Bewertungsraster für Deutsch-Aufsichtsarbeiten (Klasse 3-6)',
    subject: 'Deutsch',
    type: 'ANALYTIC',
    maxPoints: 100,
    criteria: [
      {
        name: 'Inhalt / Ideen',
        description: 'Originalität und Relevanz der Ideen',
        weight: 2.0,
        maxPoints: 30,
        levels: [
          { label: 'Sehr gut', description: 'Ideenreich, originell und thematisch passend', points: 30 },
          { label: 'Gut', description: 'Gute Ideen, thematisch passend', points: 24 },
          { label: 'Befriedigend', description: 'Ansätze erkennbar, teilweise oberflächlich', points: 18 },
          { label: 'Ausreichend', description: 'Wenig eigene Ideen, thematisch kaum erkennbar', points: 12 },
        ],
      },
      {
        name: 'Sprache / Ausdruck',
        description: 'Wortschatz, Satzbau und Ausdrucksfähigkeit',
        weight: 2.0,
        maxPoints: 30,
        levels: [
          { label: 'Sehr gut', description: 'Reicher Wortschatz, abwechslungsreicher Satzbau', points: 30 },
          { label: 'Gut', description: 'Guter Wortschatz, überwiegend korrekte Sätze', points: 24 },
          { label: 'Befriedigend', description: 'Einfacher Wortschatz, einige Satzfehler', points: 18 },
          { label: 'Ausreichend', description: 'Sehr eingeschränkter Wortschatz, viele Fehler', points: 12 },
        ],
      },
      {
        name: 'Rechtschreibung / Grammatik',
        description: 'Orthografische und grammatische Korrektheit',
        weight: 1.5,
        maxPoints: 20,
        levels: [
          { label: 'Sehr gut', description: 'Kaum Rechtschreib- oder Grammatikfehler', points: 20 },
          { label: 'Gut', description: 'Wenige Fehler, die das Verständnis nicht stören', points: 16 },
          { label: 'Befriedigend', description: 'Einige Fehler, Lesbarkeit teilweise beeinträchtigt', points: 12 },
          { label: 'Ausreichend', description: 'Viele Fehler, Text schwer verständlich', points: 8 },
        ],
      },
      {
        name: 'Aufbau / Struktur',
        description: 'Logischer Aufbau und Gliederung des Textes',
        weight: 1.5,
        maxPoints: 20,
        levels: [
          { label: 'Sehr gut', description: 'Klarer, logischer Aufbau mit rotem Faden', points: 20 },
          { label: 'Gut', description: 'Aufbau erkennbar, kleine Sprünge', points: 16 },
          { label: 'Befriedigend', description: 'Aufbau teilweise erkennbar', points: 12 },
          { label: 'Ausreichend', description: 'Unstrukturierter Text', points: 8 },
        ],
      },
    ],
  },
  {
    id: 'english-writing',
    title: 'Englisch — Writing Task',
    description: 'Assessment rubric for English writing tasks (Grade 3-6)',
    subject: 'Englisch',
    type: 'ANALYTIC',
    maxPoints: 100,
    criteria: [
      {
        name: 'Content / Ideas',
        description: 'Relevance and development of ideas',
        weight: 2.0,
        maxPoints: 30,
        levels: [
          { label: 'Excellent', description: 'Ideas are well-developed, relevant and creative', points: 30 },
          { label: 'Good', description: 'Ideas are relevant and mostly developed', points: 24 },
          { label: 'Satisfactory', description: 'Some relevant ideas, limited development', points: 18 },
          { label: 'Adequate', description: 'Few relevant ideas, minimal development', points: 12 },
        ],
      },
      {
        name: 'Language / Vocabulary',
        description: 'Range and accuracy of vocabulary and grammar',
        weight: 2.0,
        maxPoints: 30,
        levels: [
          { label: 'Excellent', description: 'Wide vocabulary, accurate grammar, varied sentence structures', points: 30 },
          { label: 'Good', description: 'Good vocabulary, mostly accurate grammar', points: 24 },
          { label: 'Satisfactory', description: 'Basic vocabulary, some grammatical errors', points: 18 },
          { label: 'Adequate', description: 'Very limited vocabulary, frequent errors', points: 12 },
        ],
      },
      {
        name: 'Organization',
        description: 'Text structure and coherence',
        weight: 1.5,
        maxPoints: 20,
        levels: [
          { label: 'Excellent', description: 'Well-organized, clear paragraphs, logical flow', points: 20 },
          { label: 'Good', description: 'Mostly organized, some coherence issues', points: 16 },
          { label: 'Satisfactory', description: 'Basic organization, limited coherence', points: 12 },
          { label: 'Adequate', description: 'Poorly organized, difficult to follow', points: 8 },
        ],
      },
      {
        name: 'Spelling / Mechanics',
        description: 'Spelling, punctuation, and capitalization',
        weight: 1.0,
        maxPoints: 20,
        levels: [
          { label: 'Excellent', description: 'Very few errors in spelling and mechanics', points: 20 },
          { label: 'Good', description: 'Few errors that do not impede understanding', points: 16 },
          { label: 'Satisfactory', description: 'Some errors, readability partially affected', points: 12 },
          { label: 'Adequate', description: 'Many errors, text difficult to understand', points: 8 },
        ],
      },
    ],
  },
  {
    id: 'general-project',
    title: 'Allgemein — Projektarbeit',
    description: 'Bewertungsraster für fächerübergreifende Projektarbeiten',
    subject: 'Allgemein',
    type: 'ANALYTIC',
    maxPoints: 100,
    criteria: [
      {
        name: 'Recherche / Informationsbeschaffung',
        description: 'Umfang und Qualität der recherchierten Informationen',
        weight: 1.5,
        maxPoints: 25,
        levels: [
          { label: 'Sehr gut', description: 'Umfangreiche und qualitativ hochwertige Informationen aus verschiedenen Quellen', points: 25 },
          { label: 'Gut', description: 'Gute Informationsbeschaffung, verschiedene Quellen', points: 20 },
          { label: 'Befriedigend', description: 'Ausreichende Informationen, wenige Quellen', points: 15 },
          { label: 'Ausreichend', description: 'Wenig Informationen, kaum Quellen', points: 10 },
        ],
      },
      {
        name: 'Präsentation / Darstellung',
        description: 'Klarheit, Struktur und Anschaulichkeit der Präsentation',
        weight: 1.5,
        maxPoints: 25,
        levels: [
          { label: 'Sehr gut', description: 'Klar strukturiert, ansprechend und verständlich präsentiert', points: 25 },
          { label: 'Gut', description: 'Gut strukturiert, überwiegend verständlich', points: 20 },
          { label: 'Befriedigend', description: 'Struktur erkennbar, Darstellung teilweise unklar', points: 15 },
          { label: 'Ausreichend', description: 'Wenig Struktur, Darstellung unklar', points: 10 },
        ],
      },
      {
        name: 'Teamarbeit / Kooperation',
        description: 'Zusammenarbeit im Team und Beitrag zum Gesamtergebnis',
        weight: 1.0,
        maxPoints: 25,
        levels: [
          { label: 'Sehr gut', description: 'Aktive Mitarbeit, konstruktive Zusammenarbeit', points: 25 },
          { label: 'Gut', description: 'Gute Mitarbeit, Zusammenarbeit funktioniert', points: 20 },
          { label: 'Befriedigend', description: 'Mitarbeit erkennbar, Zusammenarbeit teilweise', points: 15 },
          { label: 'Ausreichend', description: 'Geringe Mitarbeit, wenig Kooperation', points: 10 },
        ],
      },
      {
        name: 'Eigenständigkeit / Kreativität',
        description: 'Eigene Ideen und kreativer Umgang mit dem Thema',
        weight: 1.0,
        maxPoints: 25,
        levels: [
          { label: 'Sehr gut', description: 'Viele eigene Ideen, kreativer Zugang zum Thema', points: 25 },
          { label: 'Gut', description: 'Einige eigene Ideen, kreative Ansätze', points: 20 },
          { label: 'Befriedigend', description: 'Wenige eigene Ideen, wenig Kreativität', points: 15 },
          { label: 'Ausreichend', description: 'Kaum eigene Ideen, rein reproduktiv', points: 10 },
        ],
      },
    ],
  },
  {
    id: 'oral-presentation',
    title: 'Allgemein — Mündliche Präsentation',
    description: 'Bewertungsraster für mündliche Präsentationen und Referate',
    subject: 'Allgemein',
    type: 'ANALYTIC',
    maxPoints: 100,
    criteria: [
      {
        name: 'Inhalt / Fachwissen',
        description: 'Tiefe und Korrektheit des vermittelten Wissens',
        weight: 2.0,
        maxPoints: 30,
        levels: [
          { label: 'Sehr gut', description: 'Fachlich korrekt, tiefgründig und umfassend', points: 30 },
          { label: 'Gut', description: 'Fachlich weitgehend korrekt und informativ', points: 24 },
          { label: 'Befriedigend', description: 'Grundlagen verständlich, einige Lücken', points: 18 },
          { label: 'Ausreichend', description: 'Oberflächlich, fachliche Mängel', points: 12 },
        ],
      },
      {
        name: 'Vortragsweise',
        description: 'Freies Sprechen, Lautstärke, Betonung und Tempo',
        weight: 1.5,
        maxPoints: 25,
        levels: [
          { label: 'Sehr gut', description: 'Frei und flüssig, gut verständlich, angemessenes Tempo', points: 25 },
          { label: 'Gut', description: 'Überwiegend frei, gut verständlich', points: 20 },
          { label: 'Befriedigend', description: 'Teilweise abgelesen, verständlich', points: 15 },
          { label: 'Ausreichend', description: 'Viel abgelesen, schwer verständlich', points: 10 },
        ],
      },
      {
        name: 'Medieneinsatz',
        description: 'Sinnvoller Einsatz von Hilfsmitteln und Medien',
        weight: 1.0,
        maxPoints: 25,
        levels: [
          { label: 'Sehr gut', description: 'Medien zielgerichtet und unterstützend eingesetzt', points: 25 },
          { label: 'Gut', description: 'Medien sinnvoll eingesetzt', points: 20 },
          { label: 'Befriedigend', description: 'Medien eingesetzt, aber nicht immer passend', points: 15 },
          { label: 'Ausreichend', description: 'Kaum oder unpassender Medieneinsatz', points: 10 },
        ],
      },
      {
        name: 'Beantwortung von Fragen',
        description: 'Fähigkeit, auf Nachfragen kompetent zu antworten',
        weight: 1.0,
        maxPoints: 20,
        levels: [
          { label: 'Sehr gut', description: 'Sichere und differenzierte Antworten', points: 20 },
          { label: 'Gut', description: 'Überwiegend sichere Antworten', points: 16 },
          { label: 'Befriedigend', description: 'Antworten mit Hilfestellung möglich', points: 12 },
          { label: 'Ausreichend', description: 'Kaum Antworten möglich', points: 8 },
        ],
      },
    ],
  },
];

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');

    let filtered = TEMPLATES;
    if (subject && subject !== 'all') {
      filtered = TEMPLATES.filter((t) => t.subject === subject || t.subject === 'Allgemein');
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Rubric templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
