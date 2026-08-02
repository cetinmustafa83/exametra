/**
 * Unified Grading Engine
 * Consolidates all grading logic from:
 * - grading-view.tsx
 * - tablet-grading-view.tsx
 * - grade-analytics-view.tsx
 * - ai-grading-audit logic
 */

export type GradeScale = 1 | 2 | 3 | 4 | 5 | 6; // German grading scale
export type MasteryLevel = 'emerging' | 'developing' | 'proficient' | 'advanced';

export interface GradingConfig {
  scaleType: 'numeric' | 'competency' | 'points'; // numeric=1-6, competency=E/D/P/A, points=0-100
  maxScore?: number; // for point-based grading
  masteryLevels?: MasteryLevel[];
  weights?: Record<string, number>; // for weighted grading
  passingScore?: number; // default 4 for numeric, configurable otherwise
}

export interface GradeInput {
  score: number | GradeScale | MasteryLevel;
  maxScore?: number;
  studentId: string;
  assessmentId: string;
  timestamp: Date;
  notes?: string;
}

export interface GradeOutput {
  originalScore: number | GradeScale | MasteryLevel;
  normalizedScore: number; // 0-100 for comparison
  grade: GradeScale | MasteryLevel; // final grade
  isPassing: boolean;
  feedback: string;
  competencyMap?: Record<string, MasteryLevel>;
}

/**
 * Normalize different grading scales to 0-100
 */
export function normalizeScore(
  score: number | GradeScale | MasteryLevel,
  config: GradingConfig
): number {
  if (typeof score === 'string') {
    // Competency level to percentage
    const masteryMap: Record<MasteryLevel, number> = {
      emerging: 25,
      developing: 50,
      proficient: 75,
      advanced: 100,
    };
    return masteryMap[score as MasteryLevel] || 0;
  }

  if (config.scaleType === 'numeric') {
    // German scale (1-6) to percentage: 1=100%, 6=0%
    return ((7 - (score as number)) / 6) * 100;
  }

  if (config.scaleType === 'points') {
    // Point-based to percentage
    const max = config.maxScore || 100;
    return ((score as number) / max) * 100;
  }

  return score as number;
}

/**
 * Convert normalized score back to target scale
 */
export function denormalizeScore(
  normalized: number,
  config: GradingConfig
): GradeScale | MasteryLevel | number {
  if (config.scaleType === 'numeric') {
    // Percentage back to German scale
    const scale = Math.round((100 - normalized) / (100 / 6)) + 1;
    return Math.max(1, Math.min(6, scale)) as GradeScale;
  }

  if (config.scaleType === 'competency') {
    if (normalized >= 75) return 'advanced';
    if (normalized >= 50) return 'proficient';
    if (normalized >= 25) return 'developing';
    return 'emerging';
  }

  if (config.scaleType === 'points') {
    const max = config.maxScore || 100;
    return Math.round((normalized / 100) * max);
  }

  return normalized;
}

/**
 * Determine if grade is passing
 */
export function isPassing(
  score: number | GradeScale | MasteryLevel,
  config: GradingConfig
): boolean {
  const normalized = normalizeScore(score, config);
  const passingPercentage =
    config.passingScore !== undefined ? config.passingScore : 50;

  return normalized >= passingPercentage;
}

/**
 * Generate feedback message based on performance
 */
export function generateFeedback(
  normalized: number,
  config: GradingConfig
): string {
  const feedbackMap: Record<string, string> = {
    excellent: 'Ausgezeichnete Leistung! Weiterhin so gut!',
    good: 'Gute Leistung. Du machst Fortschritte!',
    satisfactory: 'Befriedigende Leistung. Einige Bereiche können verbessert werden.',
    adequate: 'Ausreichende Leistung. Mehr Anstrengung ist erforderlich.',
    poor: 'Unzureichende Leistung. Zusätzliche Unterstützung wird empfohlen.',
  };

  if (normalized >= 90) return feedbackMap.excellent;
  if (normalized >= 75) return feedbackMap.good;
  if (normalized >= 60) return feedbackMap.satisfactory;
  if (normalized >= 50) return feedbackMap.adequate;
  return feedbackMap.poor;
}

/**
 * Process a grade with full analysis
 */
export function processGrade(
  input: GradeInput,
  config: GradingConfig
): GradeOutput {
  const normalized = normalizeScore(input.score, config);
  const grade = denormalizeScore(normalized, config);
  const passing = isPassing(input.score, config);
  const feedback = generateFeedback(normalized, config);

  return {
    originalScore: input.score,
    normalizedScore: normalized,
    grade: grade as GradeScale | MasteryLevel,
    isPassing: passing,
    feedback,
  };
}

/**
 * Calculate weighted grade from multiple components
 */
export function calculateWeightedGrade(
  components: Array<{
    name: string;
    score: number | GradeScale | MasteryLevel;
    weight: number;
  }>,
  config: GradingConfig
): GradeOutput {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const comp of components) {
    const normalized = normalizeScore(comp.score, config);
    const weight = config.weights?.[comp.name] || comp.weight || 1;

    weightedSum += normalized * weight;
    totalWeight += weight;
  }

  const finalNormalized = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const grade = denormalizeScore(finalNormalized, config);
  const passing = isPassing(grade, config);
  const feedback = generateFeedback(finalNormalized, config);

  return {
    originalScore: components[0]?.score ?? 0,
    normalizedScore: finalNormalized,
    grade: grade as GradeScale | MasteryLevel,
    isPassing: passing,
    feedback,
  };
}

/**
 * Compare grades (for analytics)
 */
export function compareGrades(
  grade1: number | GradeScale | MasteryLevel,
  grade2: number | GradeScale | MasteryLevel,
  config: GradingConfig
): number {
  const norm1 = normalizeScore(grade1, config);
  const norm2 = normalizeScore(grade2, config);
  return norm2 - norm1; // positive = improvement, negative = decline
}

/**
 * Get grading statistics
 */
export function getStatistics(
  grades: Array<number | GradeScale | MasteryLevel>,
  config: GradingConfig
) {
  const normalized = grades.map((g) => normalizeScore(g, config));

  const sum = normalized.reduce((a, b) => a + b, 0);
  const avg = sum / normalized.length;
  const sorted = [...normalized].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = Math.min(...normalized);
  const max = Math.max(...normalized);
  const stdDev = Math.sqrt(
    normalized.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / normalized.length
  );

  return {
    average: avg,
    median,
    min,
    max,
    stdDev,
    count: grades.length,
    passingCount: grades.filter((g) => isPassing(g, config)).length,
    passingPercentage:
      (grades.filter((g) => isPassing(g, config)).length / grades.length) * 100,
  };
}
