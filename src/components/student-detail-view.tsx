'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ArrowLeft, User, Calendar, School, Hash, FileText, ClipboardCheck,
  Calculator, Flower2, BookOpen, GraduationCap, TrendingUp, Award,
  Printer, ChevronRight, Sparkles, MessageSquare, Grid3X3, Trophy, Flag, Zap,
  Rocket, Target, PenLine, Pencil, Home, ClipboardList, Star, BarChart3,
  LucideIcon, Download, FileSpreadsheet, FileDown, Heart, Users as UsersIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore, type CurrentUser } from '@/lib/store';
import { t } from '@/lib/i18n';
import { fetchStudentDetail, getReportPdfUrl, type StudentDetailData, fetchParentLinks, type ParentStudentLinkData } from '@/lib/api';
import { toast } from 'sonner';
import TeacherNotesSection from './teacher-notes-section';

// ─── Journey Timeline Time Filter State ─────────────────────────────────
type JourneyTimeRange = '30' | '90' | 'all';

function useJourneyTimeRange() {
  const [range, setRange] = React.useState<JourneyTimeRange>('all');
  return [range, setRange] as const;
}

function JourneyTimeFilter({ range, setRange }: { range: JourneyTimeRange; setRange: (v: JourneyTimeRange) => void }) {
  const options: { value: JourneyTimeRange; labelKey: string }[] = [
    { value: '30', labelKey: 'student.journey_last_30' },
    { value: '90', labelKey: 'student.journey_last_90' },
    { value: 'all', labelKey: 'student.journey_all' },
  ];
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setRange(opt.value)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${
            range === opt.value
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  );
}

// ─── Journey Timeline Types ─────────────────────────────────────────────
interface MilestoneItem {
  key: string;
  date: string;
  type: 'achieved' | 'started' | 'above_avg' | 'grade';
  title: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function JourneyTimeline({
  progressEntries,
  assessmentResults,
  computedGrades,
  reports,
  timeRange,
}: {
  progressEntries: StudentDetailData['progressEntries'];
  assessmentResults: StudentDetailData['assessmentResults'];
  computedGrades: StudentDetailData['computedGrades'];
  reports: StudentDetailData['reports'];
  timeRange: JourneyTimeRange;
}) {

  // Build milestones from data
  const milestones = React.useMemo(() => {
    const items: MilestoneItem[] = [];

    // Progress entries with mastery ≥ 3.5 → competency achieved
    const seenCategories = new Set<string>();
    for (const e of progressEntries) {
      const cat = e.competency.category?.name ?? '';
      // First entry in a new category → started new area
      if (cat && !seenCategories.has(cat)) {
        seenCategories.add(cat);
        items.push({
          key: `started-${e.id}`,
          date: e.date,
          type: 'started',
          title: e.competency.category.name,
          desc: t('student.journey_started'),
          icon: Rocket,
          color: 'bg-teal-500',
          bg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300',
        });
      }
      // Mastery ≥ 3.5 → competency achieved
      if (e.masteryLevelValue >= 3.5) {
        items.push({
          key: `achieved-${e.id}`,
          date: e.date,
          type: 'achieved',
          title: e.competency.title,
          desc: t('student.journey_achieved'),
          icon: Target,
          color: 'bg-emerald-500',
          bg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
        });
      }
    }

    // Assessment results above average → above average performance
    if (assessmentResults.length > 0) {
      const scoresWithMax = assessmentResults.filter((r) => r.score !== null && r.assessment.maxScore);
      if (scoresWithMax.length > 0) {
        const avgRatio = scoresWithMax.reduce((s, r) => s + (r.score! / r.assessment.maxScore!), 0) / scoresWithMax.length;
        for (const r of scoresWithMax) {
          if (r.score !== null && r.assessment.maxScore && (r.score / r.assessment.maxScore) > avgRatio) {
            items.push({
              key: `above-${r.id}`,
              date: r.assessment.date,
              type: 'above_avg',
              title: r.assessment.title,
              desc: t('student.journey_above_avg'),
              icon: Sparkles,
              color: 'bg-amber-500',
              bg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
            });
          }
        }
      }
    }

    // Grade computation milestones
    for (const g of computedGrades) {
      items.push({
        key: `grade-${g.id}`,
        date: g.period,
        type: 'grade',
        title: `${g.subject.name} · ${g.period}`,
        desc: `${t('student.journey_grade')} — ${(g.overriddenValue ?? g.computedValue).toFixed(1)}`,
        icon: Calculator,
        color: 'bg-violet-500',
        bg: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300',
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by time range
    if (timeRange !== 'all') {
      const days = parseInt(timeRange);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return items.filter((item) => {
        const d = new Date(item.date);
        return d >= cutoff || isNaN(d.getTime());
      });
    }
    return items.slice(0, 20);
  }, [progressEntries, assessmentResults, computedGrades, timeRange]);

  if (milestones.length === 0) {
    return (
      <div className="text-center py-8">
        <Flag className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_detail.no_data')}</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0 max-h-96 overflow-y-auto scrollbar-education">
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-400 via-amber-400 to-violet-400 dark:from-emerald-600 dark:via-amber-600 dark:to-violet-600" />
      {milestones.map((m, i) => (
        <motion.div
          key={m.key}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="relative flex items-start gap-3 pl-6 py-2.5 group"
        >
          <div className={`absolute left-2.5 top-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${m.color} group-hover:scale-125 transition-transform`} style={{ zIndex: 1 }} />
          <div className="flex-1 min-w-0 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-transparent dark:from-gray-800/40 dark:to-transparent border border-gray-100/50 dark:border-gray-700/20">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`flex items-center justify-center w-5 h-5 rounded-md ${m.bg}`}>
                  <m.icon className="h-3 w-3" />
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{m.title}</p>
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{new Date(m.date).toLocaleDateString()}</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{m.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const PETAL_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#8b5cf6',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#84cc16',
];

const masteryBadge = (level: number) => {
  if (level <= 0) return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  if (level <= 1) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (level <= 2) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (level <= 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
};

const gradeColor = (value: number) => {
  if (value <= 2) return 'text-emerald-600 dark:text-emerald-400';
  if (value <= 4) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
};

const assessmentTypeIcon: Record<string, LucideIcon> = {
  TEST: FileText,
  ORAL: Pencil,
  PROJECT: Target,
  HOMEWORK: Home,
  OTHER: ClipboardList,
};

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

// ─── CSV Export Helper ───────────────────────────────────────────────────
function exportStudentCsv(data: StudentDetailData) {
  const { student, progressEntries, assessmentResults, computedGrades, flowers, stats } = data;
  const studentName = `${student.firstName} ${student.lastName}`;
  const primaryClass = student.enrollments[0]?.classGroup.name ?? '';
  const schoolName = student.school?.name ?? '';
  const rows: string[] = [];

  // Header section
  rows.push('CompetenceTrack - Student Export');
  rows.push(`Student,${studentName}`);
  rows.push(`Class,${primaryClass}`);
  rows.push(`School,${schoolName}`);
  rows.push(`Date of Birth,${student.dateOfBirth ?? ''}`);
  rows.push(`External ID,${student.externalId ?? ''}`);
  rows.push('');
  rows.push('Quick Stats');
  rows.push(`Total Progress Entries,${stats.totalProgressEntries}`);
  rows.push(`Average Mastery,${stats.averageMastery.toFixed(2)}`);
  rows.push(`Latest Grade,${stats.latestGrade ? stats.latestGrade.value.toFixed(1) : ''}`);
  rows.push(`Total Reports,${stats.totalReports}`);
  rows.push(`Total Assessments,${stats.totalAssessments}`);
  rows.push('');

  // Competence flower summary
  rows.push('Competence Flower Summary');
  rows.push('Subject,Category,Average Mastery,Assessed Competencies,Total Competencies');
  for (const flower of flowers) {
    for (const cat of flower.categories) {
      rows.push(`"${flower.subjectName}","${cat.categoryName}",${cat.averageMasteryLevel.toFixed(2)},${cat.assessedCompetencyCount},${cat.competencyCount}`);
    }
  }
  rows.push('');

  // Progress entries
  rows.push('Progress Entries');
  rows.push('Date,Competency Code,Competency Title,Category,Mastery Level,Class,Teacher,Note');
  for (const e of progressEntries) {
    const note = (e.note ?? '').replace(/"/g, '""');
    rows.push(`${e.date},"${e.competency.code}","${e.competency.title}","${e.competency.category?.name ?? ''}",${e.masteryLevelValue},"${e.classGroup.name}","${e.teacher.firstName} ${e.teacher.lastName}","${note}"`);
  }
  rows.push('');

  // Assessment results
  rows.push('Assessment Results');
  rows.push('Date,Assessment Title,Subject,Type,Score,Max Score,Mastery Level,Note');
  for (const r of assessmentResults) {
    const note = (r.note ?? '').replace(/"/g, '""');
    rows.push(`${r.assessment.date},"${r.assessment.title}","${r.assessment.subject.name}","${r.assessment.type}",${r.score ?? ''},${r.assessment.maxScore ?? ''},${r.masteryLevelValue ?? ''},"${note}"`);
  }
  rows.push('');

  // Computed grades
  rows.push('Computed Grades');
  rows.push('Subject,Period,Computed Value,Overridden Value,Finalized,Class,School Year');
  for (const g of computedGrades) {
    rows.push(`"${g.subject.name}","${g.period}",${g.computedValue.toFixed(2)},${g.overriddenValue !== null ? g.overriddenValue.toFixed(2) : ''},${g.isFinalized ? 'Yes' : 'No'},"${g.classGroup.name}","${g.schoolYear.label}"`);
  }
  rows.push('');

  const csvContent = rows.join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${studentName.replace(/\s+/g, '_')}_export.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function StudentDetailView() {
  const currentStudentId = useAppStore((s) => s.currentStudentId);
  const navigateBack = useAppStore((s) => s.navigateBack);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const currentUser = useAppStore((s) => s.currentUser);

  const isStudentSelf = currentUser?.role === 'STUDENT';
  const isParent = currentUser?.role === 'PARENT';
  const [parentLinks, setParentLinks] = useState<ParentStudentLinkData[]>([]);

  const [data, setData] = useState<StudentDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFlowerSubjectId, setSelectedFlowerSubjectId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<JourneyTimeRange>('all');

  // Load parent links for parent users
  useEffect(() => {
    if (isParent && currentUser?.id) {
      fetchParentLinks(currentUser.id).then(setParentLinks).catch(() => {});
    }
  }, [isParent, currentUser?.id]);

  useEffect(() => {
    if (!currentStudentId) {
      setLoading(false);
      return;
    }
    const studentId = currentStudentId; // capture for closure
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const d = await fetchStudentDetail(studentId);
        if (cancelled) return;
        setData(d);
        if (d.flowers.length > 0) {
          setSelectedFlowerSubjectId(d.flowers[0].subjectId);
        } else {
          setSelectedFlowerSubjectId('');
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : t('error.generic'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [currentStudentId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data || !currentStudentId) {
    return (
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="py-16 text-center">
          <User className="h-12 w-12 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('student_detail.no_data')}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl"
            onClick={() => navigateBack()}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('student_detail.back')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { student, progressEntries, assessmentResults, computedGrades, reports, flowers, stats } = data;
  const studentName = `${student.firstName} ${student.lastName}`;
  const age = calcAge(student.dateOfBirth);
  const initials = `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
  const primaryClass = student.enrollments[0]?.classGroup;
  const currentFlower = flowers.find((f) => f.subjectId === selectedFlowerSubjectId) ?? null;

  const chartData = currentFlower?.categories.map((cat, i) => ({
    category: cat.categoryName,
    value: cat.averageMasteryLevel > 0 ? cat.averageMasteryLevel : 0.2,
    fill: PETAL_COLORS[i % PETAL_COLORS.length],
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Back button + Export actions */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <Button
          variant="ghost"
          onClick={() => navigateBack()}
          className="text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('student_detail.back')}
        </Button>
        <div className="flex items-center gap-2 no-print">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => {
              exportStudentCsv(data);
              toast.success(t('student.export_csv'));
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            {t('student.export_csv')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
            onClick={() => {
              window.print();
            }}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            {t('student.print_report')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            onClick={() => {
              window.print();
              toast.success(t('student.export_pdf'));
            }}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {t('student.export_pdf')}
          </Button>
        </div>
      </div>

      {/* Header card with student info & quick stats */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden relative">
          {/* Decorative background pattern */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-teal-500/4 to-violet-500/8 dark:from-emerald-500/12 dark:via-teal-500/6 dark:to-violet-500/10 pointer-events-none" />
          <div className="absolute inset-0 bg-pattern-dots opacity-50 pointer-events-none" />
          <CardContent className="p-6 relative">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar + name */}
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  {/* Decorative halo */}
                  <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-br from-emerald-400/30 via-teal-400/20 to-amber-400/20 dark:from-emerald-500/20 dark:to-teal-500/10 blur-md animate-pulse-soft" />
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-50 dark:from-emerald-900/40 dark:via-teal-900/30 dark:to-emerald-900/20 text-emerald-700 dark:text-emerald-200 text-2xl font-bold ring-2 ring-emerald-200/60 dark:ring-emerald-700/40 shadow-lg shadow-emerald-200/40 dark:shadow-emerald-900/30">
                    {initials}
                  </div>
                  {/* Mastery badge */}
                  <div className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 dark:from-amber-400 dark:to-amber-600 ring-2 ring-white dark:ring-gray-900 shadow-sm text-xs">
                    <Star className="w-3.5 h-3.5 text-amber-900" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold gradient-text">{studentName}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    {primaryClass && (
                      <span className="flex items-center gap-1">
                        <School className="h-3.5 w-3.5 text-emerald-500" />
                        {t('student_detail.class')}: <strong className="text-gray-700 dark:text-gray-300">{primaryClass.name}</strong>
                      </span>
                    )}
                    {student.school && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-teal-500" />
                        {student.school.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                    {student.dateOfBirth && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-amber-500" />
                        {new Date(student.dateOfBirth).toLocaleDateString()}
                        {age !== null && (
                          <span className="text-amber-600/70 dark:text-amber-400/50">({age} {t('student_detail.years')})</span>
                        )}
                      </span>
                    )}
                    {student.externalId && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3.5 w-3.5 text-violet-500" />
                        {student.externalId}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 md:justify-end">
                <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20 text-center hover:shadow-md hover:shadow-emerald-100/40 dark:hover:shadow-emerald-900/20 transition-shadow">
                  <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 animate-count-up" key={`entries-${stats.totalProgressEntries}`}>{stats.totalProgressEntries}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('student_detail.total_entries')}</p>
                </div>
                <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-900/10 border border-teal-200/30 dark:border-teal-900/20 text-center hover:shadow-md hover:shadow-teal-100/40 dark:hover:shadow-teal-900/20 transition-shadow">
                  <Award className="h-4 w-4 text-teal-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300 animate-count-up" key={`mastery-${stats.averageMastery}`}>{stats.averageMastery.toFixed(1)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">{t('student_detail.avg_mastery')}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20 text-center hover:shadow-md hover:shadow-amber-100/40 dark:hover:shadow-amber-900/20 transition-shadow">
                  <Calculator className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                  <p className={`text-lg font-bold ${stats.latestGrade ? gradeColor(stats.latestGrade.value) : 'text-gray-400'}`}>
                    {stats.latestGrade ? stats.latestGrade.value.toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">{t('student_detail.latest_grade')}</p>
                </div>
                <div className="p-3 rounded-xl bg-violet-50/60 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20 text-center hover:shadow-md hover:shadow-violet-100/40 dark:hover:shadow-violet-900/20 transition-shadow">
                  <FileText className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-violet-700 dark:text-violet-300 animate-count-up" key={`reports-${stats.totalReports}`}>{stats.totalReports}</p>
                  <p className="text-[10px] uppercase tracking-wider text-violet-600/60 dark:text-violet-400/40">{t('student_detail.reports')}</p>
                </div>
              </div>
            </div>

            {/* Class enrollment badges */}
            {student.enrollments.length > 0 && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('student_detail.class')}:</span>
                {student.enrollments.map((e, i) => (
                  <Badge
                    key={i}
                    className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium"
                  >
                    {e.classGroup.name} · {e.schoolYear.label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Competence Flower (mini radar) */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <Flower2 className="h-4 w-4" />
              </div>
              {t('student_detail.competence_flower')}
            </CardTitle>
            {flowers.length > 0 && (
              <Select value={selectedFlowerSubjectId} onValueChange={setSelectedFlowerSubjectId}>
                <SelectTrigger className="h-8 w-48 rounded-lg text-xs border-teal-200 dark:border-teal-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {flowers.map((f) => (
                    <SelectItem key={f.subjectId} value={f.subjectId}>{f.subjectName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {flowers.length === 0 ? (
            <div className="text-center py-10">
              <Flower2 className="h-10 w-10 text-teal-400 dark:text-teal-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t('student_detail.no_flower')}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('student_detail.no_flower_hint')}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-xl border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300"
                onClick={() => setCurrentView('flower')}
              >
                {t('student_detail.view_flower')}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ) : !currentFlower || chartData.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 dark:text-gray-400">{t('student_detail.flower_not_assigned')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="w-full">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="#94a3b8" strokeOpacity={0.5} strokeDasharray="3 3" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 4]}
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      tickCount={5}
                      stroke="#94a3b8"
                      strokeOpacity={0.6}
                    />
                    <Radar
                      name={studentName}
                      dataKey="value"
                      stroke="#14b8a6"
                      fill="#14b8a6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#14b8a6', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #a7f3d0',
                        background: '#ffffff',
                        fontSize: '12px',
                        padding: '8px 12px',
                        boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.18)',
                      }}
                      itemStyle={{ color: '#0f172a' }}
                      labelStyle={{ color: '#0f766e', fontWeight: 600 }}
                      formatter={(value: number) => [`${value.toFixed(2)} / 4`, t('student_detail.value')]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center mt-1 italic">
                  {t('student_detail.value_hint')}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center mt-0.5 italic">
                  {t('student_detail.sparse_chart_hint')}
                </p>
              </div>
              {/* Category breakdown */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-education">
                {currentFlower.categories.map((cat, i) => (
                  <div
                    key={cat.categoryId}
                    className="p-3 rounded-lg bg-gray-50/80 dark:bg-gray-800/30 border-l-3"
                    style={{ borderLeftColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PETAL_COLORS[i % PETAL_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cat.categoryName}</span>
                      </div>
                      <TooltipProvider>
                        <ShadTooltip>
                          <TooltipTrigger asChild>
                            <Badge className={`${cat.averageMasteryLevel > 0 ? masteryBadge(cat.averageMasteryLevel) : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'} text-xs cursor-default`}>
                              {cat.averageMasteryLevel > 0 ? cat.averageMasteryLevel.toFixed(2) : t('student_detail.no_assessment')}
                            </Badge>
                          </TooltipTrigger>
                          <ShadTooltipContent side="top" className="text-xs">
                            {cat.averageMasteryLevel > 0 ? `${cat.averageMasteryLevel.toFixed(2)} / 4` : t('student_detail.no_assessment')}
                          </ShadTooltipContent>
                        </ShadTooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
                        style={{ width: `${(cat.averageMasteryLevel / 4) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      {cat.assessedCompetencyCount} / {cat.competencyCount} {t('student_detail.competency').toLowerCase()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress timeline */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="h-4 w-4" />
              </div>
              {t('student_detail.progress_timeline')}
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">
                {progressEntries.length}
              </Badge>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
              onClick={() => {
                useAppStore.getState().setCurrentStudent(student.id);
                setCurrentView('progress');
              }}
            >
              {t('student_detail.view_progress')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {progressEntries.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-8 w-8 text-emerald-400 dark:text-emerald-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_progress_entries')}</p>
            </div>
          ) : (
            <div className="relative max-h-96 overflow-y-auto scrollbar-education">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-emerald-200/50 dark:bg-emerald-900/30" />
              {progressEntries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="relative flex items-start gap-4 pl-4 py-3"
                >
                  <div className="absolute left-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 shrink-0 bg-emerald-500" style={{ zIndex: 1 }} />
                  <div className="ml-6 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${masteryBadge(entry.masteryLevelValue)} text-xs`}>
                        {entry.masteryLevelValue}
                      </Badge>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {entry.competency.code} — {entry.competency.title}
                      </span>
                    </div>
                    {entry.competency.category && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {entry.competency.category.name} · {entry.classGroup.name}
                      </p>
                    )}
                    {entry.note && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 italic">"{entry.note}"</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-emerald-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs text-emerald-600/70 dark:text-emerald-400/50">
                        — {entry.teacher.firstName} {entry.teacher.lastName}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Assessment results + Computed grades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment results */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              {t('student_detail.assessment_results')}
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium">
                {assessmentResults.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assessmentResults.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_assessments')}</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-education">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-amber-200/30 dark:border-amber-900/20">
                      <TableHead className="text-xs uppercase text-amber-600/70 dark:text-amber-400/50">{t('student_detail.assessment')}</TableHead>
                      <TableHead className="text-xs uppercase text-amber-600/70 dark:text-amber-400/50">{t('student_detail.date')}</TableHead>
                      <TableHead className="text-right text-xs uppercase text-amber-600/70 dark:text-amber-400/50">{t('student_detail.score')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessmentResults.map((r, idx) => (
                      <TableRow key={r.id} className={idx % 2 === 1 ? 'bg-amber-50/20 dark:bg-amber-900/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex items-center">{(() => { const Icon = assessmentTypeIcon[r.assessment.type] ?? ClipboardList; return <Icon className="w-4 h-4" />; })()}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{r.assessment.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{r.assessment.subject.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{new Date(r.assessment.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          {r.score !== null && r.assessment.maxScore ? (
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                              {r.score} / {r.assessment.maxScore}
                            </Badge>
                          ) : r.masteryLevelValue !== null ? (
                            <Badge className={`${masteryBadge(r.masteryLevelValue)} text-xs`}>
                              {r.masteryLevelValue}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Computed grades */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                <Calculator className="h-4 w-4" />
              </div>
              {t('student_detail.computed_grades')}
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium">
                {computedGrades.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {computedGrades.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="h-8 w-8 text-violet-400 dark:text-violet-500 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_grades')}</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto scrollbar-education">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-violet-200/30 dark:border-violet-900/20">
                      <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('student_detail.subject')}</TableHead>
                      <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('student_detail.period')}</TableHead>
                      <TableHead className="text-right text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('student_detail.value')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {computedGrades.map((g, idx) => {
                      const value = g.overriddenValue ?? g.computedValue;
                      return (
                        <TableRow key={g.id} className={idx % 2 === 1 ? 'bg-violet-50/20 dark:bg-violet-900/5' : ''}>
                          <TableCell className="text-sm font-medium">{g.subject.name}</TableCell>
                          <TableCell className="text-xs text-gray-500">{g.period}</TableCell>
                          <TableCell className="text-right">
                            <span className={`text-lg font-bold ${gradeColor(value)}`}>
                              {value.toFixed(1)}
                            </span>
                            {g.overriddenValue !== null && (
                              <Zap className="w-3 h-3 inline text-amber-600 dark:text-amber-400" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reports list */}
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
              <FileText className="h-4 w-4" />
            </div>
            {t('student_detail.reports')}
            <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-medium">
              {reports.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 text-rose-400 dark:text-rose-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">{t('student_detail.no_reports')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-education">
              {reports.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-rose-400/40 hover:border-l-rose-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{r.period}</p>
                        <Badge className={`text-xs ${r.status === 'FINAL' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {r.status}
                        </Badge>
                        {r.includesGrades && (
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs">
                            <BarChart3 className="w-3 h-3 inline" /> {t('student_detail.computed_grades')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {r.classGroup.name} · {r.schoolYear.label}
                      </p>
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50 mt-0.5">
                        {t('student_detail.generated_at')}: {new Date(r.generatedAt).toLocaleDateString()} — {r.generatedByUser.firstName} {r.generatedByUser.lastName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                      onClick={() => window.open(getReportPdfUrl(r.id), '_blank')}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      {t('student_detail.print_report')}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student journey timeline + competency mastery grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student journey timeline — enhanced with milestones & time filter */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Flag className="h-4 w-4" />
                </div>
                {t('student.journey')}
              </CardTitle>
              <JourneyTimeFilter range={timeRange} setRange={setTimeRange} />
            </div>
          </CardHeader>
          <CardContent>
            <JourneyTimeline
              progressEntries={progressEntries}
              assessmentResults={assessmentResults}
              computedGrades={computedGrades}
              reports={reports}
              timeRange={timeRange}
            />
          </CardContent>
        </Card>

        {/* Competency mastery grid */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <Grid3X3 className="h-4 w-4" />
              </div>
              {t('polish.competency_grid')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentFlower && currentFlower.categories.length > 0 ? (
              <div className="space-y-3">
                {currentFlower.categories.map((cat, i) => {
                  const catColor = PETAL_COLORS[i % PETAL_COLORS.length];
                  // Generate deterministic pseudo mastery cells per category
                  let h = 0;
                  for (let j = 0; j < cat.categoryId.length; j++) h = (h * 31 + cat.categoryId.charCodeAt(j)) | 0;
                  h = Math.abs(h);
                  const cells = Array.from({ length: cat.competencyCount }, (_, idx) => {
                    if (idx < cat.assessedCompetencyCount) {
                      const lvl = 1 + ((h >> (idx * 2)) & 3);
                      return lvl;
                    }
                    return 0; // unassessed
                  });
                  return (
                    <div key={cat.categoryId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{cat.categoryName}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{cat.assessedCompetencyCount}/{cat.competencyCount}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cells.map((lvl, idx) => (
                          <div
                            key={idx}
                            className={`w-4 h-4 rounded-sm transition-all hover:scale-110 cursor-default ${
                              lvl === 0 ? 'bg-gray-200 dark:bg-gray-700'
                              : lvl === 1 ? 'bg-red-400 dark:bg-red-500'
                              : lvl === 2 ? 'bg-amber-400 dark:bg-amber-500'
                              : lvl === 3 ? 'bg-emerald-400 dark:bg-emerald-500'
                              : 'bg-teal-400 dark:bg-teal-500'
                            }`}
                            title={`#${idx + 1} · ${lvl === 0 ? t('polish.never') : `${t('polish.level_' + lvl)}`}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {/* Legend */}
                <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200/40 dark:border-gray-700/30">
                  {[
                    { lvl: 0, label: t('polish.never'), color: 'bg-gray-300 dark:bg-gray-600' },
                    { lvl: 1, label: t('polish.level_1'), color: 'bg-red-400' },
                    { lvl: 2, label: t('polish.level_2'), color: 'bg-amber-400' },
                    { lvl: 3, label: t('polish.level_3'), color: 'bg-emerald-400' },
                    { lvl: 4, label: t('polish.level_4'), color: 'bg-teal-400' },
                  ].map((l) => (
                    <span key={l.lvl} className="inline-flex items-center gap-1">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${l.color}`} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Grid3X3 className="h-8 w-8 text-teal-400 dark:text-teal-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_detail.no_flower')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent achievements + Teacher notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent achievements */}
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <Trophy className="h-4 w-4" />
              </div>
              {t('polish.recent_achievements')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const achievements = progressEntries
                .filter((e) => e.masteryLevelValue >= 3.5)
                .slice(0, 6);
              if (achievements.length === 0) {
                return (
                  <div className="text-center py-8">
                    <Trophy className="h-8 w-8 text-emerald-400 dark:text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('polish.no_results')}</p>
                  </div>
                );
              }
              const achievementBadges: { icon: LucideIcon; label: string; color: string }[] = [
                { icon: Trophy, label: t('polish.level_4'), color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300' },
                { icon: Star, label: t('polish.strengths'), color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                { icon: Sparkles, label: t('polish.level_3'), color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
                { icon: Target, label: t('label.mastery'), color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
                { icon: BookOpen, label: t('nav.competencies'), color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' },
              ];
              return (
                <div className="space-y-2">
                  {achievements.map((e, i) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/15 dark:to-transparent border border-emerald-200/30 dark:border-emerald-900/20"
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full ${achievementBadges[i % achievementBadges.length].color} text-base`}>
                        {(() => { const BadgeIcon = achievementBadges[i % achievementBadges.length].icon; return <BadgeIcon className="w-4 h-4" />; })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{e.competency.title}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{e.competency.category.name} · {new Date(e.date).toLocaleDateString()}</p>
                      </div>
                      <Badge className={`text-[10px] ${masteryBadge(e.masteryLevelValue)}`}>
                        {e.masteryLevelValue.toFixed(1)}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Teacher notes — replaced with the dedicated TeacherNotesSection */}
        <TeacherNotesSection studentId={student.id} />

        {/* My Progress section (for student self-view) */}
        {isStudentSelf && (
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                {t('student.my_competencies')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t('student.progress_overview')}</p>
              {/* Mastery Level Visualization */}
              <div className="space-y-3">
                {stats.averageMastery > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('student_detail.avg_mastery')}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{stats.averageMastery.toFixed(1)} / 4.0</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-1000"
                        style={{ width: `${Math.min(100, (stats.averageMastery / 4) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {stats.totalProgressEntries > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('student_detail.total_entries')}</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.totalProgressEntries}</span>
                  </div>
                )}
                {stats.latestGrade && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-teal-50/50 dark:bg-teal-900/10 border border-teal-100/50 dark:border-teal-900/20">
                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('student_detail.latest_grade')}</span>
                    <span className="text-sm font-bold text-teal-600 dark:text-teal-400">{stats.latestGrade.value.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parent Info section (for parent users) */}
        {isParent && parentLinks.length > 0 && (
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <Heart className="h-4 w-4" />
                </div>
                {t('parent.my_children')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {parentLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/20">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                        {link.student.firstName[0]}{link.student.lastName[0]}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{link.student.firstName} {link.student.lastName}</span>
                    </div>
                    {link.relationship && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 shrink-0">
                        {t(`parent.${link.relationship}`)}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
