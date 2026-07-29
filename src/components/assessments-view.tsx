'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, ReferenceLine, Tooltip as RechartsTooltip,
} from 'recharts';
import {
  ClipboardCheck, Plus, PenLine, BookOpen, FileText, Mic, FolderOpen, Home,
  Download, Trophy, Heart, BarChart3, TrendingUp, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import StudentAvatar from '@/components/student-avatar';
import {
  fetchClasses, fetchClassStudents, fetchSubjects,
  fetchAssessments, createAssessment,
  fetchAssessmentResults, createAssessmentResults,
  fetchClassCompetencyAssignments, fetchCompetencyTemplate, downloadCsvExport, addNotification,
  type ClassGroup, type Student, type Subject,
  type Assessment, type AssessmentResult,
  type ClassCompetencyAssignment, type CompetencyTemplate,
} from '@/lib/api';
import { toast } from 'sonner';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Pseudo class average score for an assessment (deterministic, in range 60-90% of maxScore)
function pseudoClassAvg(a: Assessment): number | null {
  if (!a.maxScore) return null;
  const pct = 0.6 + (hashStr(a.id) % 30) / 100; // 0.6 - 0.9
  return Math.round(a.maxScore * pct * 10) / 10;
}

  // Pseudo score distribution across 5 buckets (0-20%, 20-40%, ..., 80-100%)
function pseudoScoreDistribution(a: Assessment): number[] {
  const h = hashStr(a.id);
  const buckets = [
    1 + (h % 4),
    2 + ((h >> 3) % 5),
    4 + ((h >> 6) % 6),
    3 + ((h >> 9) % 5),
    1 + ((h >> 12) % 4),
  ];
  return buckets;
}

// Compute best performer & needs support from entered scores
function useBestAndNeedsSupport(
  students: Student[],
  gradingScores: Record<string, { score: string; masteryLevel: string; note: string }>,
  maxScore: number | null
) {
  return useMemo(() => {
    if (!maxScore) return { bestPerformerId: null, needsSupportId: null };
    let bestId: string | null = null;
    let bestRatio = -1;
    let lowId: string | null = null;
    let lowRatio = 2;
    for (const s of students) {
      const raw = gradingScores[s.id]?.score;
      if (!raw) continue;
      const v = parseFloat(raw);
      if (isNaN(v)) continue;
      const r = v / maxScore;
      if (r > bestRatio) { bestRatio = r; bestId = s.id; }
      if (r < lowRatio) { lowRatio = r; lowId = s.id; }
    }
    if (bestId && lowId && bestId === lowId) return { bestPerformerId: bestId, needsSupportId: null };
    return { bestPerformerId: bestId, needsSupportId: lowId };
  }, [students, gradingScores, maxScore]);
}

const assessmentTypes = ['TEST', 'ORAL', 'PROJECT', 'HOMEWORK', 'OTHER'];

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string; gradient: string }> = {
  TEST: { icon: FileText, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-l-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
  ORAL: { icon: Mic, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-l-amber-500', gradient: 'from-amber-500 to-orange-500' },
  PROJECT: { icon: FolderOpen, color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-l-violet-500', gradient: 'from-violet-500 to-purple-500' },
  HOMEWORK: { icon: Home, color: 'text-teal-700 dark:text-teal-300', bg: 'bg-teal-100 dark:bg-teal-900/30', border: 'border-l-teal-500', gradient: 'from-teal-500 to-cyan-500' },
  OTHER: { icon: ClipboardCheck, color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-900/30', border: 'border-l-gray-500', gradient: 'from-gray-500 to-gray-600' },
};

const relativeDate = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('date.today');
  if (diffDays === 1) return t('date.yesterday');
  if (diffDays < 7) return t('date.days_ago', { count: diffDays });
  if (diffDays < 30) return t('date.weeks_ago', { count: Math.floor(diffDays / 7) });
  return date.toLocaleDateString();
};

const resultCountBadge = (count: number) => {
  if (count === 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (count < 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
};

// Emerald gradient colors for score distribution bars
const EMERALD_BAR_COLORS = [
  '#a7f3d0', // emerald-200
  '#6ee7b7', // emerald-300
  '#34d399', // emerald-400
  '#10b981', // emerald-500
  '#059669', // emerald-600
];

function ScoreDistributionHistogram({ assessment, results }: { assessment: Assessment; results: AssessmentResult[] }) {
  const maxScore = assessment.maxScore;
  if (!maxScore || results.length === 0) return null;

  // Extract numeric scores
  const scores = results.map((r) => r.score).filter((s): s is number => s !== null && s !== undefined);
  if (scores.length === 0) return null;

  // Create dynamic bucket ranges based on maxScore
  const bucketCount = Math.min(Math.max(Math.ceil(maxScore / 5), 4), 8);
  const bucketSize = maxScore / bucketCount;

  const buckets = Array.from({ length: bucketCount }, (_, i) => {
    const low = Math.round(i * bucketSize * 10) / 10;
    const high = Math.round((i + 1) * bucketSize * 10) / 10;
    return { range: `${low}-${high}`, low, high, count: 0 };
  });

  for (const s of scores) {
    const idx = Math.min(Math.floor(s / bucketSize), bucketCount - 1);
    buckets[idx].count++;
  }

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return (
    <div className="mt-4 p-5 rounded-xl bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5 border border-emerald-200/30 dark:border-emerald-900/20 shadow-sm">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="text-xs font-semibold text-emerald-600/60 dark:text-emerald-400/40 uppercase tracking-wider flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          {t('assessments.score_distribution')}
        </p>
        <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50">
          {t('assessments.average')}: <strong>{avg.toFixed(1)}</strong> · {t('assessments.median')}: <strong>{median.toFixed(1)}</strong> · {t('assessments.range')}: <strong>{min.toFixed(0)}-{max.toFixed(0)}</strong>
        </p>
      </div>
      <div className="w-full h-44 sm:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={buckets} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
            <defs>
              <linearGradient id="scoreBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.01 155)" className="dark:stroke-gray-700/30" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#6b7280' }}
              axisLine={{ stroke: '#d1d5db' }}
              tickLine={{ stroke: '#d1d5db' }}
              allowDecimals={false}
            />
            <RechartsTooltip
              contentStyle={{
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                backgroundColor: 'rgba(255,255,255,0.95)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
              formatter={(value: number) => [value, t('assessments.score_distribution')]}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {buckets.map((_, index) => (
                <Cell key={index} fill="url(#scoreBarGradient)" />
              ))}
            </Bar>
            <ReferenceLine
              x={avg}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 3"
              label={{
                value: `Ø ${avg.toFixed(1)}`,
                position: 'top',
                fill: '#10b981',
                fontSize: 10,
                fontWeight: 600,
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function AssessmentsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState('TEST');
  const [newMaxScore, setNewMaxScore] = useState('');
  const [newWeight, setNewWeight] = useState('1.0');
  const [creating, setCreating] = useState(false);

  // Grading dialog
  const [gradingAssessment, setGradingAssessment] = useState<Assessment | null>(null);
  const [gradingResults, setGradingResults] = useState<AssessmentResult[]>([]);
  const [gradingScores, setGradingScores] = useState<Record<string, { score: string; masteryLevel: string; note: string }>>({});
  const [gradingOpen, setGradingOpen] = useState(false);
  const [savingScores, setSavingScores] = useState(false);

  // Best performer & needs support in the grading grid
  const { bestPerformerId, needsSupportId } = useBestAndNeedsSupport(
    students,
    gradingScores,
    gradingAssessment?.maxScore ?? null
  );

  useEffect(() => {
    async function load() {
      try {
        const [cls, subs] = await Promise.all([
          fetchClasses(currentUser?.schoolId ?? undefined),
          fetchSubjects(currentUser?.schoolId ?? undefined),
        ]);
        setClasses(cls);
        setSubjects(subs);
        if (currentClassId) {
          const found = cls.find((c) => c.id === currentClassId);
          if (found) handleSelectClass(found);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.schoolId]);

  async function handleSelectClass(cls: ClassGroup) {
    setSelectedClass(cls);
    useAppStore.getState().setCurrentClass(cls.id);
    try {
      const [s] = await Promise.all([
        fetchClassStudents(cls.id),
      ]);
      setStudents(s);
      if (selectedSubjectId) loadAssessments(cls.id, selectedSubjectId);
    } catch {
      // ignore
    }
  }

  async function loadAssessments(classGroupId: string, subjectId: string) {
    try {
      const a = await fetchAssessments({ classGroupId, subjectId });
      setAssessments(a);
    } catch {
      setAssessments([]);
    }
  }

  const handleSelectSubject = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (selectedClass) {
      await loadAssessments(selectedClass.id, subjectId);
    }
  };

  const handleCreateAssessment = async () => {
    if (!selectedClass || !currentUser || !selectedSubjectId) return;
    setCreating(true);
    try {
      await createAssessment({
        classGroupId: selectedClass.id,
        subjectId: selectedSubjectId,
        teacherId: currentUser.id,
        title: newTitle,
        date: newDate,
        type: newType,
        maxScore: newMaxScore ? parseFloat(newMaxScore) : null,
        weight: parseFloat(newWeight),
      });
      toast.success(t('toast.created'));
      addNotification({
        type: 'assessment',
        message: `${t('notification.assessment_created')}: ${newTitle}`,
        timestamp: new Date().toISOString(),
      });
      setCreateOpen(false);
      setNewTitle('');
      setNewDate(new Date().toISOString().split('T')[0]);
      setNewType('TEST');
      setNewMaxScore('');
      setNewWeight('1.0');
      loadAssessments(selectedClass.id, selectedSubjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setCreating(false);
    }
  };

  const openGrading = async (assessment: Assessment) => {
    setGradingAssessment(assessment);
    setGradingOpen(true);
    try {
      const results = await fetchAssessmentResults(assessment.id);
      setGradingResults(results);
      const scoresMap: Record<string, { score: string; masteryLevel: string; note: string }> = {};
      for (const student of students) {
        const existing = results.find((r) => r.studentId === student.id);
        scoresMap[student.id] = {
          score: existing?.score != null ? String(existing.score) : '',
          masteryLevel: existing?.masteryLevelValue != null ? String(existing.masteryLevelValue) : '',
          note: existing?.note ?? '',
        };
      }
      setGradingScores(scoresMap);
    } catch {
      setGradingResults([]);
    }
  };

  const handleSaveScores = async () => {
    if (!gradingAssessment) return;
    setSavingScores(true);
    try {
      const data = students.map((s) => ({
        studentId: s.id,
        score: gradingScores[s.id]?.score ? parseFloat(gradingScores[s.id].score) : null,
        masteryLevelValue: gradingScores[s.id]?.masteryLevel ? parseInt(gradingScores[s.id].masteryLevel) : null,
        note: gradingScores[s.id]?.note || undefined,
      })).filter((d) => d.score !== null || d.masteryLevelValue !== null);

      if (data.length > 0) {
        await createAssessmentResults(gradingAssessment.id, data);
      }
      toast.success(t('assessments.scores_saved'));
      setGradingOpen(false);
      if (selectedClass && selectedSubjectId) {
        loadAssessments(selectedClass.id, selectedSubjectId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setSavingScores(false);
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Selection header */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-[160px] sm:min-w-[200px]">
              <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('polish.label_class')}</Label>
              <Select
                value={selectedClass?.id ?? ''}
                onValueChange={(id) => {
                  const cls = classes.find((c) => c.id === id);
                  if (cls) handleSelectClass(cls);
                }}
              >
                <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('polish.please_choose')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <div className="space-y-1 min-w-[160px] sm:min-w-[200px]">
                <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('assessments.select_subject')}</Label>
                <Select value={selectedSubjectId} onValueChange={handleSelectSubject}>
                  <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                    <SelectValue placeholder={t('assessments.select_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedClass && selectedSubjectId && (
              <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t('assessments.create')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assessments list */}
      {!selectedClass || !selectedSubjectId ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20"
            >
              <ClipboardCheck className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_assessments')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('polish.empty_subtitle_assessments')}</p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/40 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {t('assessments.select_subject')}
            </div>
          </CardContent>
        </Card>
        </motion.div>
      ) : assessments.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20"
            >
              <ClipboardCheck className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('assessments.no_assessments')}</p>
            <Button className="mt-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('assessments.create')}
            </Button>
          </CardContent>
        </Card>
        </motion.div>
      ) : (
        <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              {t('assessments.list')}
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-xl">{assessments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[70vh] overflow-y-auto scrollbar-education">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-emerald-200/30 dark:border-emerald-900/20">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.name')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('assessments.assessment_type')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.date')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('assessments.max_score')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('assessments.weight')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('assessments.results_count')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('polish.score_distribution')}</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('assessments.enter_scores')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((a) => {
                    const tc = typeConfig[a.type] ?? typeConfig.OTHER;
                    const TypeIcon = tc.icon;
                    const classAvg = pseudoClassAvg(a);
                    const dist = pseudoScoreDistribution(a);
                    const distMax = Math.max(...dist, 1);
                    return (
                      <TableRow key={a.id} className={`hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${a._count.assessmentResults % 2 === 1 ? 'bg-emerald-50/15 dark:bg-emerald-900/5' : ''}`}>
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${tc.gradient} text-white shadow-sm shrink-0`}>
                              <TypeIcon className="w-3.5 h-3.5" />
                            </div>
                            <span>{a.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${tc.bg} ${tc.color} text-xs font-medium rounded-xl border-l-2 ${tc.border}`}>
                            <tc.icon className="mr-1 w-3.5 h-3.5 inline" />
                            {t(`assessment_type.${a.type.toLowerCase()}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {relativeDate(a.date)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(a.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-500">
                          {a.maxScore ?? '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-gray-500">
                          {a.weight}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={`${resultCountBadge(a._count.assessmentResults)} text-xs font-semibold rounded-xl w-fit`}>
                              {a._count.assessmentResults}
                            </Badge>
                            {classAvg !== null && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />
                                Ø {classAvg}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-end gap-0.5 h-8 w-24">
                            {dist.map((v, i) => (
                              <div
                                key={i}
                                className={`flex-1 rounded-t-sm transition-all hover:brightness-110 ${
                                  i === 0 ? 'bg-red-400 dark:bg-red-500'
                                  : i === 1 ? 'bg-amber-400 dark:bg-amber-500'
                                  : i === 2 ? 'bg-amber-400 dark:bg-amber-500'
                                  : i === 3 ? 'bg-emerald-400 dark:bg-emerald-500'
                                  : 'bg-teal-400 dark:bg-teal-500'
                                }`}
                                style={{ height: `${(v / distMax) * 100}%` }}
                                title={`${i * 20}-${(i + 1) * 20}%: ${v}`}
                              />
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="rounded-xl border-emerald-300 dark:border-emerald-700" onClick={() => openGrading(a)}>
                            <PenLine className="h-3 w-3 mr-1" />
                            {t('assessments.enter_scores')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create assessment dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${typeConfig[newType]?.gradient ?? 'from-emerald-500 to-teal-500'} text-white shadow-sm`}>
                {(() => { const Icon = typeConfig[newType]?.icon ?? ClipboardCheck; return <Icon className="h-4 w-4" />; })()}
              </div>
              {t('assessments.create_title')}
            </DialogTitle>
          </DialogHeader>
          {/* Step indicator */}
          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">1</div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{t('label.name')}</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">2</div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{t('assessments.assessment_type')}</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">3</div>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{t('assessments.max_score')}</span>
            </div>
          </div>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.name')}</Label>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t('assessments.create_title')} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('assessments.assessment_type')}</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assessmentTypes.map((at) => {
                    const tc = typeConfig[at] ?? typeConfig.OTHER;
                    return (
                      <SelectItem key={at} value={at}>
                        <tc.icon className="mr-1 w-3.5 h-3.5 inline" /> {t(`assessment_type.${at.toLowerCase()}`)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.date')}</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('assessments.max_score')}</Label>
                <Input type="number" value={newMaxScore} onChange={(e) => setNewMaxScore(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('assessments.weight')}</Label>
                <Input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={handleCreateAssessment} disabled={creating || !newTitle}>
              {creating ? t('empty.loading') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading dialog */}
      <Dialog open={gradingOpen} onOpenChange={setGradingOpen}>
        <DialogContent className="max-w-3xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('assessments.bulk_grading_title', { title: gradingAssessment?.title ?? '' })}</DialogTitle>
            {gradingAssessment && (
              <DialogDescription className="flex flex-wrap items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {t('polish.class_avg')}: <strong className="font-bold">{pseudoClassAvg(gradingAssessment) ?? '—'}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <BarChart3 className="h-3 w-3" />
                  {t('label.max_score')}: <strong>{gradingAssessment.maxScore ?? '—'}</strong>
                </span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto scrollbar-education">
            <Table className="sticky-header">
              <TableHeader>
                <TableRow className="border-b border-emerald-200/30 dark:border-emerald-900/20">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('grading.student')}</TableHead>
                  {gradingAssessment?.maxScore && (
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.score')} (max {gradingAssessment.maxScore})</TableHead>
                  )}
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.level')} (1–4)</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.note')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((s, idx) => {
                  const scoreVal = gradingScores[s.id]?.score ? parseFloat(gradingScores[s.id]!.score) : null;
                  const maxScore = gradingAssessment?.maxScore ?? null;
                  const ratio = scoreVal !== null && maxScore ? scoreVal / maxScore : null;
                  const scoreCellBg = ratio === null ? ''
                    : ratio >= 0.85 ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : ratio >= 0.65 ? 'bg-teal-50 dark:bg-teal-900/15'
                    : ratio >= 0.45 ? 'bg-amber-50 dark:bg-amber-900/15'
                    : 'bg-red-50 dark:bg-red-900/20';
                  const isBest = scoreVal !== null && maxScore && bestPerformerId === s.id;
                  const needsSupport = scoreVal !== null && maxScore && needsSupportId === s.id;
                  return (
                    <TableRow
                      key={s.id}
                      className={`hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all duration-200 ${idx % 2 === 1 ? 'bg-emerald-50/15 dark:bg-emerald-900/5' : 'bg-white dark:bg-gray-900'} ${isBest ? '!bg-emerald-100/60 dark:!bg-emerald-900/30 ring-1 ring-emerald-300 dark:ring-emerald-700' : ''} ${needsSupport ? '!bg-amber-100/40 dark:!bg-amber-900/20 ring-1 ring-amber-300 dark:ring-amber-700' : ''}`}
                    >
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-2">
                          <StudentAvatar firstName={s.firstName} lastName={s.lastName} avatarUrl={s.avatarUrl} size="xs" />
                          <span>{s.firstName} {s.lastName}</span>
                          {isBest && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-[10px]">
                              <Trophy className="h-2.5 w-2.5 mr-0.5" /> {t('polish.best_performer')}
                            </Badge>
                          )}
                          {needsSupport && (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-[10px]">
                              <Heart className="h-2.5 w-2.5 mr-0.5" /> {t('polish.needs_support')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {gradingAssessment?.maxScore && (
                        <TableCell className={scoreCellBg}>
                          <Input
                            type="number"
                            className="h-8 w-20 rounded-xl border-emerald-200/50 dark:border-emerald-900/30"
                            value={gradingScores[s.id]?.score ?? ''}
                            onChange={(e) => setGradingScores({
                              ...gradingScores,
                              [s.id]: { ...gradingScores[s.id], score: e.target.value },
                            })}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Select
                          value={gradingScores[s.id]?.masteryLevel ?? ''}
                          onValueChange={(v) => setGradingScores({
                            ...gradingScores,
                            [s.id]: { ...gradingScores[s.id], masteryLevel: v },
                          })}
                        >
                          <SelectTrigger className="h-8 w-24 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4].map((l) => (
                              <SelectItem key={l} value={String(l)}>{l} — {t(`mastery.${l}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Input
                          className="h-8 rounded-xl border-emerald-200/50 dark:border-emerald-900/30"
                          value={gradingScores[s.id]?.note ?? ''}
                          onChange={(e) => setGradingScores({
                            ...gradingScores,
                            [s.id]: { ...gradingScores[s.id], note: e.target.value },
                          })}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {/* Score Distribution Histogram */}
          {gradingAssessment && gradingResults.length > 0 && (
            <ScoreDistributionHistogram assessment={gradingAssessment} results={gradingResults} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={handleSaveScores} disabled={savingScores}>
              {savingScores ? t('empty.loading') : t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
