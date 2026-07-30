'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  FileText,
  Download,
  Filter,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  GraduationCap,
  School,
  Target,
  BarChart2,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  FileSpreadsheet,
  Settings2,
  Plus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';

// ── Types ──────────────────────────────────────────────────────────

interface GradeDistribution {
  grade: number;
  count: number;
  percentage: number;
  color: string;
  label: string;
}

interface BellCurvePoint {
  x: number;
  y: number;
}

interface DistributionData {
  type: string;
  distribution: GradeDistribution[];
  bellCurve: BellCurvePoint[];
  mean: number;
  stdDev: number;
  total: number;
}

interface SubjectDistribution {
  id: string;
  name: string;
  distribution: Record<number, number>;
}

interface TrendPoint {
  date: string;
  average: number;
  count: number;
  grade1: number;
  grade2: number;
  grade3: number;
  grade4: number;
  grade5: number;
  grade6: number;
}

interface StudentTrajectory {
  id: string;
  name: string;
  data: Array<{ date: string; grade: number }>;
}

interface StudentImprovement {
  studentId: string;
  name: string;
  trend: 'improving' | 'stable' | 'regressing';
  firstGrade: number;
  lastGrade: number;
  change: number;
}

interface PercentileData {
  id: string;
  name: string;
  average: number;
  percentile: number;
}

interface ClassRanking {
  id: string;
  name: string;
  gradeLevel: number;
  average: number;
  median: number;
  stdDev: number;
  gradeCount: number;
  rank: number;
  anonymizedName: string;
}

interface SubjectComparison {
  subjectId: string;
  subjectName: string;
  classes: Array<{
    classId: string;
    className: string;
    average: number;
    count: number;
  }>;
}

interface SubjectRanking {
  id: string;
  name: string;
  average: number;
  variance: number;
  gradeCount: number;
  difficulty: string;
}

interface CorrelationEntry {
  subject1: string;
  subject2: string;
  name1: string;
  name2: string;
  correlation: number;
}

interface TeacherRanking {
  id: string;
  name: string;
  classIds: string[];
  average: number;
  classCount: number;
  gradeCount: number;
}

interface GradeReportItem {
  id: string;
  title: string;
  type: string;
  dateRange: string;
  status: string;
  generatedBy: string;
  createdAt: string;
  hasFileData: boolean;
}

interface AnalyticsOverview {
  totalGrades: number;
  averageGrade: number;
  minGrade: number;
  maxGrade: number;
  finalizedCount: number;
  draftCount: number;
  distribution: Record<number, number>;
  topPerformers: Array<{ id: string; name: string; average: number; gradeCount: number }>;
  bottomPerformers: Array<{ id: string; name: string; average: number; gradeCount: number }>;
  riskStudents: Array<{ id: string; name: string; average: number; gradeCount: number }>;
  classes: Array<{ id: string; name: string; gradeLevel: number }>;
  subjects: Array<{ id: string; name: string }>;
  subjectDifficulty: Array<{ id: string; name: string; average: number; gradeCount: number }>;
  classAverages: Array<{ id: string; name: string; average: number; gradeCount: number }>;
  teacherComparison: Array<{ id: string; name: string; average: number; gradeCount: number }>;
}

// ── Grade color mapping (German 1-6 scale) ────────────────────────

const GRADE_COLORS: Record<number, string> = {
  1: '#10b981', // emerald
  2: '#22c55e', // green
  3: '#eab308', // yellow
  4: '#f59e0b', // amber
  5: '#f97316', // orange
  6: '#ef4444', // red
};

const GRADE_LABELS_DE: Record<number, string> = {
  1: 'Sehr gut',
  2: 'Gut',
  3: 'Befriedigend',
  4: 'Ausreichend',
  5: 'Mangelhaft',
  6: 'Ungenügend',
};

const GRADE_LABELS_EN: Record<number, string> = {
  1: 'Very good',
  2: 'Good',
  3: 'Satisfactory',
  4: 'Adequate',
  5: 'Poor',
  6: 'Inadequate',
};

// ── Animated counter component ─────────────────────────────────────

function AnimatedCounter({ value, duration = 1200, decimals = 0 }: { value: number; duration?: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (value - start) * eased;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{display.toFixed(decimals)}</span>;
}

// ── Main Component ─────────────────────────────────────────────────

export default function GradeAnalyticsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const schoolYearId = useAppStore((s) => s.schoolYearId);

  const role = currentUser?.role ?? '';
  const schoolId = currentUser?.schoolId ?? '';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // State
  const [activeTab, setActiveTab] = useState('distribution');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [distribution, setDistribution] = useState<DistributionData | null>(null);
  const [subjectDistribution, setSubjectDistribution] = useState<{ subjects: SubjectDistribution[]; gradeColors: Record<number, string> } | null>(null);
  const [classDistribution, setClassDistribution] = useState<{ classes: SubjectDistribution[]; gradeColors: Record<number, string> } | null>(null);
  const [trends, setTrends] = useState<{ trendData: TrendPoint[]; studentTrajectories: StudentTrajectory[]; studentImprovements: StudentImprovement[]; percentileData: PercentileData[]; totalAssessments: number } | null>(null);
  const [comparison, setComparison] = useState<{ classRanking: ClassRanking[]; subjectComparison: SubjectComparison[] } | null>(null);
  const [subjectAnalysis, setSubjectAnalysis] = useState<{ subjectRanking: SubjectRanking[]; correlationMatrix: CorrelationEntry[]; recommendations: Array<{ subjectId: string; subjectName: string; recommendations: string[] }> } | null>(null);
  const [teacherComparison, setTeacherComparison] = useState<{ teacherRanking: TeacherRanking[] } | null>(null);
  const [reports, setReports] = useState<GradeReportItem[]>([]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [distributionGroupBy, setDistributionGroupBy] = useState<string>('overall');

  // Report builder
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState('quarterly');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');
  const [reportMetrics, setReportMetrics] = useState<string[]>(['distribution', 'averages', 'classComparison', 'subjectAnalysis']);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Distribution group by
  const [distView, setDistView] = useState<'overall' | 'subject' | 'class'>('overall');

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      if (selectedClassId !== 'all') params.set('classGroupId', selectedClassId);
      if (selectedSubjectId !== 'all') params.set('subjectId', selectedSubjectId);
      if (schoolYearId) params.set('schoolYearId', schoolYearId);

      const res = await fetch(`/api/grade-analytics?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedClassId, selectedSubjectId, schoolYearId]);

  // Fetch distribution data
  const fetchDistribution = useCallback(async (groupBy: string) => {
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      if (selectedClassId !== 'all') params.set('classGroupId', selectedClassId);
      if (selectedSubjectId !== 'all') params.set('subjectId', selectedSubjectId);
      if (schoolYearId) params.set('schoolYearId', schoolYearId);
      params.set('groupBy', groupBy);

      const res = await fetch(`/api/grade-analytics/distribution?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (groupBy === 'overall') setDistribution(data);
        else if (groupBy === 'subject') setSubjectDistribution(data);
        else if (groupBy === 'class') setClassDistribution(data);
      }
    } catch (err) {
      console.error('Failed to fetch distribution:', err);
    }
  }, [schoolId, selectedClassId, selectedSubjectId, schoolYearId]);

  // Fetch trends data
  const fetchTrends = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      if (selectedClassId !== 'all') params.set('classGroupId', selectedClassId);
      if (selectedSubjectId !== 'all') params.set('subjectId', selectedSubjectId);
      if (schoolYearId) params.set('schoolYearId', schoolYearId);

      const res = await fetch(`/api/grade-analytics/trends?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTrends(data);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    }
  }, [schoolId, selectedClassId, selectedSubjectId, schoolYearId]);

  // Fetch comparison data
  const fetchComparison = useCallback(async (type: string) => {
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      if (schoolYearId) params.set('schoolYearId', schoolYearId);
      params.set('compareType', type);

      const res = await fetch(`/api/grade-analytics/comparison?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (type === 'class') setComparison(data);
        else if (type === 'subject') setSubjectAnalysis(data);
        else if (type === 'teacher') setTeacherComparison(data);
      }
    } catch (err) {
      console.error('Failed to fetch comparison:', err);
    }
  }, [schoolId, schoolYearId]);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);

      const res = await fetch(`/api/grade-analytics/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  }, [schoolId]);

  // Initial data load
  useEffect(() => {
    fetchOverview();
    fetchDistribution('overall');
    fetchTrends();
    fetchComparison('class');
    fetchComparison('subject');
    fetchReports();
    if (isAdmin) {
      fetchComparison('teacher');
    }
  }, [fetchOverview, fetchDistribution, fetchTrends, fetchComparison, fetchReports, isAdmin]);

  // Fetch distribution when view changes
  useEffect(() => {
    if (activeTab === 'distribution') {
      fetchDistribution(distView);
    }
  }, [activeTab, distView, fetchDistribution]);

  // Generate report
  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true);
      const res = await fetch('/api/grade-analytics/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: reportTitle || `${reportType} Report`,
          type: reportType,
          dateRange: JSON.stringify({ from: reportDateFrom || null, to: reportDateTo || null }),
          classIds: selectedClassId !== 'all' ? JSON.stringify([selectedClassId]) : null,
          subjectIds: selectedSubjectId !== 'all' ? JSON.stringify([selectedSubjectId]) : null,
          metrics: JSON.stringify(reportMetrics),
          schoolId,
        }),
      });
      if (res.ok) {
        await fetchReports();
        setReportDialogOpen(false);
        setReportTitle('');
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Export CSV
  const handleExportCSV = useCallback(() => {
    if (!overview) return;
    const rows: string[] = [];
    rows.push(['Grade', 'Count', 'Percentage'].join(','));
    Object.entries(overview.distribution).forEach(([grade, count]) => {
      const pct = overview.totalGrades > 0 ? Math.round((count / overview.totalGrades) * 10000) / 100 : 0;
      rows.push([grade, count, `${pct}%`].join(','));
    });
    rows.push('');
    rows.push(['Class', 'Average Grade', 'Grade Count'].join(','));
    overview.classAverages.forEach((c) => {
      rows.push([c.name, c.average, c.gradeCount].join(','));
    });
    rows.push('');
    rows.push(['Subject', 'Average Grade', 'Grade Count'].join(','));
    overview.subjectDifficulty.forEach((s) => {
      rows.push([s.name, s.average, s.gradeCount].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grade-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [overview]);

  // Grade labels based on locale
  const gradeLabels = locale === 'de' ? GRADE_LABELS_DE : GRADE_LABELS_EN;

  // Distribution chart data
  const distributionChartData = useMemo(() => {
    if (!distribution) return [];
    return distribution.distribution.map((d) => ({
      name: `${d.grade} - ${gradeLabels[d.grade as keyof typeof gradeLabels]}`,
      count: d.count,
      percentage: d.percentage,
      fill: d.color,
    }));
  }, [distribution, gradeLabels]);

  // Subject distribution chart data
  const subjectDistChartData = useMemo(() => {
    if (!subjectDistribution) return [];
    const subjects = subjectDistribution.subjects.slice(0, 8);
    return subjects.map((s) => ({
      name: s.name,
      grade1: s.distribution[1] || 0,
      grade2: s.distribution[2] || 0,
      grade3: s.distribution[3] || 0,
      grade4: s.distribution[4] || 0,
      grade5: s.distribution[5] || 0,
      grade6: s.distribution[6] || 0,
    }));
  }, [subjectDistribution]);

  // Class distribution chart data
  const classDistChartData = useMemo(() => {
    if (!classDistribution) return [];
    const classes = classDistribution.classes.slice(0, 8);
    return classes.map((c) => ({
      name: c.name,
      grade1: c.distribution[1] || 0,
      grade2: c.distribution[2] || 0,
      grade3: c.distribution[3] || 0,
      grade4: c.distribution[4] || 0,
      grade5: c.distribution[5] || 0,
      grade6: c.distribution[6] || 0,
    }));
  }, [classDistribution]);

  // Class comparison chart data
  const classComparisonData = useMemo(() => {
    if (!comparison) return [];
    return comparison.classRanking.map((c) => ({
      name: c.name,
      average: c.average,
      median: c.median,
      stdDev: c.stdDev,
      gradeCount: c.gradeCount,
    }));
  }, [comparison]);

  // Subject comparison radar data
  const subjectRadarData = useMemo(() => {
    if (!overview) return [];
    return overview.subjectDifficulty.map((s) => ({
      subject: s.name.length > 12 ? s.name.substring(0, 12) + '...' : s.name,
      average: Math.max(0, 7 - s.average), // Invert: higher = better performance
      fullMark: 6,
    }));
  }, [overview]);

  // Trend chart data
  const trendChartData = useMemo(() => {
    if (!trends) return [];
    return trends.trendData.map((t) => ({
      date: t.date,
      average: t.average,
      count: t.count,
    }));
  }, [trends]);

  // Loading state
  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
          <p className="text-muted-foreground">{t('grade_analytics.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-xl"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tOC04aDR2LTRoLTR2NHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8" />
            <h1 className="text-2xl font-bold">{t('grade_analytics.title')}</h1>
          </div>
          <p className="text-emerald-100 text-sm max-w-2xl">
            {t('grade_analytics.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            {overview && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2"
                >
                  <div className="text-xs text-emerald-200">{t('grade_analytics.total_grades')}</div>
                  <div className="text-xl font-bold"><AnimatedCounter value={overview.totalGrades} /></div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2"
                >
                  <div className="text-xs text-emerald-200">{t('grade_analytics.average_grade')}</div>
                  <div className="text-xl font-bold"><AnimatedCounter value={overview.averageGrade} decimals={2} /></div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2"
                >
                  <div className="text-xs text-emerald-200">{t('grade_analytics.finalized')}</div>
                  <div className="text-xl font-bold"><AnimatedCounter value={overview.finalizedCount} /></div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/15 backdrop-blur-sm rounded-lg px-4 py-2"
                >
                  <div className="text-xs text-emerald-200">{t('grade_analytics.risk_students')}</div>
                  <div className="text-xl font-bold text-amber-300"><AnimatedCounter value={overview.riskStudents.length} /></div>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t('grade_analytics.filters')}</span>
              </div>
              {overview && (
                <>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('grade_analytics.all_classes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('grade_analytics.all_classes')}</SelectItem>
                      {overview.classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('grade_analytics.all_subjects')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('grade_analytics.all_subjects')}</SelectItem>
                      {overview.subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => { fetchOverview(); fetchDistribution(distView); fetchTrends(); }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('action.refresh')}
              </Button>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                {(isAdmin || isTeacher) && (
                  <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                        <FileText className="h-4 w-4 mr-1" />
                        {t('grade_analytics.generate_report')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>{t('grade_analytics.report_builder')}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t('grade_analytics.report_title')}</Label>
                          <Input
                            value={reportTitle}
                            onChange={(e) => setReportTitle(e.target.value)}
                            placeholder={t('grade_analytics.report_title_placeholder')}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('grade_analytics.report_type')}</Label>
                          <Select value={reportType} onValueChange={setReportType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quarterly">{t('grade_analytics.quarterly')}</SelectItem>
                              <SelectItem value="semester">{t('grade_analytics.semester')}</SelectItem>
                              <SelectItem value="annual">{t('grade_analytics.annual')}</SelectItem>
                              <SelectItem value="custom">{t('grade_analytics.custom')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t('grade_analytics.date_from')}</Label>
                            <Input type="date" value={reportDateFrom} onChange={(e) => setReportDateFrom(e.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('grade_analytics.date_to')}</Label>
                            <Input type="date" value={reportDateTo} onChange={(e) => setReportDateTo(e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('grade_analytics.report_metrics')}</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { key: 'distribution', label: t('grade_analytics.metric_distribution') },
                              { key: 'averages', label: t('grade_analytics.metric_averages') },
                              { key: 'classComparison', label: t('grade_analytics.metric_class_comparison') },
                              { key: 'subjectAnalysis', label: t('grade_analytics.metric_subject_analysis') },
                              { key: 'studentGrades', label: t('grade_analytics.metric_student_grades') },
                              { key: 'trends', label: t('grade_analytics.metric_trends') },
                            ].map((metric) => (
                              <label key={metric.key} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={reportMetrics.includes(metric.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setReportMetrics((prev) => [...prev, metric.key]);
                                    } else {
                                      setReportMetrics((prev) => prev.filter((m) => m !== metric.key));
                                    }
                                  }}
                                  className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                                />
                                {metric.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">{t('action.cancel')}</Button>
                        </DialogClose>
                        <Button onClick={handleGenerateReport} disabled={generatingReport} className="bg-emerald-600 hover:bg-emerald-700">
                          {generatingReport ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              {t('grade_analytics.generating')}
                            </>
                          ) : (
                            <>
                              <FileText className="h-4 w-4 mr-1" />
                              {t('grade_analytics.generate')}
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="distribution" className="text-xs sm:text-sm">
            <BarChart2 className="h-4 w-4 mr-1" />
            {t('grade_analytics.distribution')}
          </TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm">
            <Users className="h-4 w-4 mr-1" />
            {t('grade_analytics.performance')}
          </TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs sm:text-sm">
            <School className="h-4 w-4 mr-1" />
            {t('grade_analytics.class_comparison')}
          </TabsTrigger>
          <TabsTrigger value="subjects" className="text-xs sm:text-sm">
            <BookOpen className="h-4 w-4 mr-1" />
            {t('grade_analytics.subject_analysis')}
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm">
            <LineChartIcon className="h-4 w-4 mr-1" />
            {t('grade_analytics.trends')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            <FileText className="h-4 w-4 mr-1" />
            {t('grade_analytics.reports')}
          </TabsTrigger>
        </TabsList>

        {/* ── Distribution Tab ─────────────────────────────────────────── */}
        <TabsContent value="distribution" className="space-y-6 mt-4">
          <div className="flex gap-2 mb-4">
            {(['overall', 'subject', 'class'] as const).map((view) => (
              <Button
                key={view}
                variant={distView === view ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDistView(view)}
                className={distView === view ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                {view === 'overall' && <BarChart2 className="h-4 w-4 mr-1" />}
                {view === 'subject' && <BookOpen className="h-4 w-4 mr-1" />}
                {view === 'class' && <School className="h-4 w-4 mr-1" />}
                {t(`grade_analytics.view_${view}`)}
              </Button>
            ))}
          </div>

          {/* Overall Distribution */}
          {distView === 'overall' && distribution && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart2 className="h-5 w-5 text-emerald-600" />
                      {t('grade_analytics.grade_distribution')}
                    </CardTitle>
                    <CardDescription>
                      {t('grade_analytics.distribution_desc')} (1-6 {t('grade_analytics.scale')})
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={distributionChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                          formatter={(value: number, name: string) => {
                            if (name === 'count') return [value, t('grade_analytics.count')];
                            return [value, name];
                          }}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {distributionChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-emerald-600" />
                      {t('grade_analytics.bell_curve')}
                    </CardTitle>
                    <CardDescription>
                      {t('grade_analytics.mean')}: {distribution.mean} | {t('grade_analytics.std_dev')}: {distribution.stdDev}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={distribution.bellCurve} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="x" tick={{ fontSize: 11 }} label={{ value: t('grade_analytics.grade'), position: 'insideBottom', offset: -5 }} />
                        <YAxis dataKey="y" />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                        <Area
                          type="monotone"
                          dataKey="y"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.2}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>

                    {/* Grade breakdown cards */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {distribution.distribution.map((d) => (
                        <motion.div
                          key={d.grade}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: d.grade * 0.1 }}
                          className="rounded-lg p-2 text-center"
                          style={{ backgroundColor: d.color + '20', borderColor: d.color, borderWidth: 1 }}
                        >
                          <div className="text-lg font-bold" style={{ color: d.color }}>{d.grade}</div>
                          <div className="text-xs text-muted-foreground">{d.count}</div>
                          <div className="text-xs font-medium" style={{ color: d.color }}>{d.percentage}%</div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {/* Subject Distribution */}
          {distView === 'subject' && subjectDistribution && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-600" />
                    {t('grade_analytics.distribution_by_subject')}
                  </CardTitle>
                  <CardDescription>{t('grade_analytics.distribution_by_subject_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={subjectDistChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="grade1" name="1" stackId="a" fill={GRADE_COLORS[1]} />
                      <Bar dataKey="grade2" name="2" stackId="a" fill={GRADE_COLORS[2]} />
                      <Bar dataKey="grade3" name="3" stackId="a" fill={GRADE_COLORS[3]} />
                      <Bar dataKey="grade4" name="4" stackId="a" fill={GRADE_COLORS[4]} />
                      <Bar dataKey="grade5" name="5" stackId="a" fill={GRADE_COLORS[5]} />
                      <Bar dataKey="grade6" name="6" stackId="a" fill={GRADE_COLORS[6]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Class Distribution */}
          {distView === 'class' && classDistribution && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-emerald-600" />
                    {t('grade_analytics.distribution_by_class')}
                  </CardTitle>
                  <CardDescription>{t('grade_analytics.distribution_by_class_desc')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={450}>
                    <BarChart data={classDistChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip contentStyle={{ borderRadius: '8px' }} />
                      <Legend />
                      <Bar dataKey="grade1" name="1" stackId="a" fill={GRADE_COLORS[1]} />
                      <Bar dataKey="grade2" name="2" stackId="a" fill={GRADE_COLORS[2]} />
                      <Bar dataKey="grade3" name="3" stackId="a" fill={GRADE_COLORS[3]} />
                      <Bar dataKey="grade4" name="4" stackId="a" fill={GRADE_COLORS[4]} />
                      <Bar dataKey="grade5" name="5" stackId="a" fill={GRADE_COLORS[5]} />
                      <Bar dataKey="grade6" name="6" stackId="a" fill={GRADE_COLORS[6]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        {/* ── Performance Tab ───────────────────────────────────────────── */}
        <TabsContent value="performance" className="space-y-6 mt-4">
          {overview && (
            <>
              {/* Top/Bottom Performers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.top_performers')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.top_performers_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-80">
                        <div className="space-y-3">
                          {overview.topPerformers.map((student, idx) => (
                            <motion.div
                              key={student.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800"
                            >
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.gradeCount} {t('grade_analytics.grades')}</div>
                              </div>
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0">
                                {student.average.toFixed(2)}
                              </Badge>
                            </motion.div>
                          ))}
                          {overview.topPerformers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">{t('grade_analytics.no_data')}</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        {t('grade_analytics.bottom_performers')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.bottom_performers_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-80">
                        <div className="space-y-3">
                          {overview.bottomPerformers.map((student, idx) => (
                            <motion.div
                              key={student.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                            >
                              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold text-sm">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.gradeCount} {t('grade_analytics.grades')}</div>
                              </div>
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0">
                                {student.average.toFixed(2)}
                              </Badge>
                            </motion.div>
                          ))}
                          {overview.bottomPerformers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">{t('grade_analytics.no_data')}</p>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Risk Students */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      {t('grade_analytics.risk_students_title')}
                    </CardTitle>
                    <CardDescription>{t('grade_analytics.risk_students_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {overview.riskStudents.length > 0 ? (
                      <ScrollArea className="max-h-64">
                        <div className="space-y-2">
                          {overview.riskStudents.map((student, idx) => (
                            <motion.div
                              key={student.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"
                            >
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{student.name}</div>
                                <div className="text-xs text-muted-foreground">{student.gradeCount} {t('grade_analytics.grades')}</div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                                  {student.average.toFixed(2)}
                                </Badge>
                                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  {t('grade_analytics.at_risk')}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center py-8 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                        <p className="text-sm text-muted-foreground">{t('grade_analytics.no_risk_students')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Student Improvement/Regression */}
              {trends && trends.studentImprovements.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.improvement_detection')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.improvement_detection_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-96">
                        <div className="space-y-2">
                          {trends.studentImprovements
                            .filter((s) => s.trend !== 'stable')
                            .slice(0, 20)
                            .map((student, idx) => (
                              <motion.div
                                key={student.studentId}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 rounded-lg border"
                              >
                                {student.trend === 'improving' ? (
                                  <ArrowUpRight className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4 text-red-500 shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{student.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {t('grade_analytics.first_grade')}: {student.firstGrade.toFixed(1)} → {t('grade_analytics.last_grade')}: {student.lastGrade.toFixed(1)}
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    student.trend === 'improving'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0'
                                  }
                                >
                                  {student.trend === 'improving' ? t('grade_analytics.improving') : t('grade_analytics.regressing')}
                                  {' '}
                                  ({student.change > 0 ? '+' : ''}{student.change.toFixed(2)})
                                </Badge>
                              </motion.div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Percentile Data */}
              {trends && trends.percentileData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.percentile_ranking')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.percentile_ranking_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-96">
                        <div className="space-y-2">
                          {trends.percentileData.slice(0, 30).map((student, idx) => (
                            <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-muted text-xs font-medium">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{student.name}</div>
                              </div>
                              <div className="text-sm font-medium">{student.average.toFixed(2)}</div>
                              <div className="w-20">
                                <Progress value={100 - student.percentile} className="h-2" />
                              </div>
                              <div className="text-xs text-muted-foreground w-16 text-right">
                                {t('grade_analytics.percentile')} {student.percentile}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Class Comparison Tab ──────────────────────────────────────── */}
        <TabsContent value="comparison" className="space-y-6 mt-4">
          {comparison && (
            <>
              {/* Class Average Comparison */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <School className="h-5 w-5 text-emerald-600" />
                      {t('grade_analytics.class_average_comparison')}
                    </CardTitle>
                    <CardDescription>{t('grade_analytics.class_average_comparison_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={classComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 6]} />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="average" name={t('grade_analytics.average')} fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="median" name={t('grade_analytics.median')} fill="#14b8a6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Class Ranking Table */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-emerald-600" />
                      {t('grade_analytics.class_ranking')}
                    </CardTitle>
                    <CardDescription>{t('grade_analytics.class_ranking_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-96">
                      <div className="space-y-2">
                        {comparison.classRanking.map((cls, idx) => (
                          <motion.div
                            key={cls.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50"
                          >
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                              #{cls.rank}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{cls.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {t('grade_analytics.anonymized')}: {cls.anonymizedName} | {t('grade_analytics.grade_level')}: {cls.gradeLevel}
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">{t('grade_analytics.average')}</div>
                                <div className="font-medium">{cls.average.toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">{t('grade_analytics.median')}</div>
                                <div className="font-medium">{cls.median.toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">{t('grade_analytics.std_dev')}</div>
                                <div className="font-medium">{cls.stdDev.toFixed(2)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-muted-foreground">{t('grade_analytics.count')}</div>
                                <div className="font-medium">{cls.gradeCount}</div>
                              </div>
                            </div>
                            <Badge
                              className={
                                cls.average <= 2 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0' :
                                cls.average <= 3 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-0' :
                                cls.average <= 4 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0' :
                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0'
                              }
                            >
                              {cls.average <= 2 ? t('grade_analytics.excellent') :
                               cls.average <= 3 ? t('grade_analytics.good') :
                               cls.average <= 4 ? t('grade_analytics.satisfactory') :
                               t('grade_analytics.needs_improvement')}
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Subject Comparison Across Classes */}
              {comparison.subjectComparison.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart2 className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.subject_comparison_across_classes')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.subject_comparison_across_classes_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={450}>
                        <BarChart
                          data={comparison.subjectComparison.slice(0, 6).map((sc) => {
                            const entry: Record<string, string | number> = { name: sc.subjectName };
                            sc.classes.forEach((c) => {
                              entry[c.className] = c.average;
                            });
                            return entry;
                          })}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 6]} />
                          <Tooltip contentStyle={{ borderRadius: '8px' }} />
                          <Legend />
                          {comparison.subjectComparison[0]?.classes.slice(0, 5).map((cls, idx) => {
                            const colors = ['#10b981', '#14b8a6', '#f59e0b', '#6366f1', '#ec4899'];
                            return (
                              <Bar
                                key={cls.classId}
                                dataKey={cls.className}
                                fill={colors[idx % colors.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            );
                          })}
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Teacher Comparison (Admin Only) */}
              {isAdmin && teacherComparison && teacherComparison.teacherRanking.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.teacher_comparison')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.teacher_comparison_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={teacherComparison.teacherRanking.map((t) => ({
                            name: t.name,
                            average: t.average,
                            gradeCount: t.gradeCount,
                          }))}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 6]} />
                          <Tooltip contentStyle={{ borderRadius: '8px' }} />
                          <Bar dataKey="average" name={t('grade_analytics.average')} fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Subject Analysis Tab ──────────────────────────────────────── */}
        <TabsContent value="subjects" className="space-y-6 mt-4">
          {subjectAnalysis && (
            <>
              {/* Subject Difficulty Ranking */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-emerald-600" />
                      {t('grade_analytics.subject_difficulty_ranking')}
                    </CardTitle>
                    <CardDescription>{t('grade_analytics.subject_difficulty_ranking_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={subjectAnalysis.subjectRanking.map((s) => ({
                          name: s.name,
                          average: s.average,
                          variance: s.variance,
                        }))}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" domain={[0, 6]} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip contentStyle={{ borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="average" name={t('grade_analytics.average_grade')} fill="#10b981" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="variance" name={t('grade_analytics.variance')} fill="#f59e0b" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Subject Radar Chart */}
              {overview && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.subject_performance_radar')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.subject_performance_radar_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <RadarChart data={subjectRadarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                          <PolarRadiusAxis domain={[0, 6]} />
                          <Radar
                            name={t('grade_analytics.performance')}
                            dataKey="average"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Cross-Subject Correlation */}
              {subjectAnalysis.correlationMatrix.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.cross_subject_correlation')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.cross_subject_correlation_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-96">
                        <div className="space-y-2">
                          {subjectAnalysis.correlationMatrix
                            .filter((c) => c.subject1 !== c.subject2)
                            .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                            .slice(0, 20)
                            .map((corr, idx) => (
                              <motion.div
                                key={`${corr.subject1}-${corr.subject2}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-3 p-3 rounded-lg border"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">
                                    {corr.name1} ↔ {corr.name2}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-24">
                                    <Progress
                                      value={Math.abs(corr.correlation) * 100}
                                      className="h-2"
                                    />
                                  </div>
                                  <Badge
                                    className={
                                      corr.correlation > 0.5
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0'
                                        : corr.correlation < -0.5
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-0'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-0'
                                    }
                                  >
                                    {corr.correlation.toFixed(2)}
                                  </Badge>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Subject Recommendations */}
              {subjectAnalysis.recommendations.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.subject_recommendations')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.subject_recommendations_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-96">
                        <div className="space-y-4">
                          {subjectAnalysis.recommendations.map((rec, idx) => (
                            <motion.div
                              key={rec.subjectId}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="p-4 rounded-lg border"
                            >
                              <h4 className="font-medium text-sm mb-2">{rec.subjectName}</h4>
                              <ul className="space-y-1">
                                {rec.recommendations.map((r, rIdx) => (
                                  <li key={rIdx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Trends Tab ────────────────────────────────────────────────── */}
        <TabsContent value="trends" className="space-y-6 mt-4">
          {trends && (
            <>
              {/* Grade Trend Over Time */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LineChartIcon className="h-5 w-5 text-emerald-600" />
                      {t('grade_analytics.grade_trends_over_time')}
                    </CardTitle>
                    <CardDescription>{t('grade_analytics.grade_trends_over_time_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={trendChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 6]} reversed />
                          <Tooltip contentStyle={{ borderRadius: '8px' }} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="average"
                            name={t('grade_analytics.average_grade')}
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 5, fill: '#10b981' }}
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            name={t('grade_analytics.assessment_count')}
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            yAxisId="left"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center py-12 text-center">
                        <LineChartIcon className="h-10 w-10 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">{t('grade_analytics.no_trend_data')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Student Trajectories */}
              {trends.studentTrajectories.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        {t('grade_analytics.student_trajectories')}
                      </CardTitle>
                      <CardDescription>{t('grade_analytics.student_trajectories_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart
                          data={(() => {
                            // Get all unique dates
                            const allDates = new Set<string>();
                            trends.studentTrajectories.slice(0, 8).forEach((st) => {
                              st.data.forEach((d) => allDates.add(d.date));
                            });
                            const sortedDates = Array.from(allDates).sort();
                            return sortedDates.map((date) => {
                              const entry: Record<string, string | number> = { date };
                              trends.studentTrajectories.slice(0, 8).forEach((st) => {
                                const point = st.data.find((d) => d.date === date);
                                if (point) {
                                  entry[st.name] = point.grade;
                                }
                              });
                              return entry;
                            });
                          })()}
                          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={[0, 6]} reversed />
                          <Tooltip contentStyle={{ borderRadius: '8px' }} />
                          <Legend />
                          {trends.studentTrajectories.slice(0, 8).map((st, idx) => {
                            const colors = ['#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4'];
                            return (
                              <Line
                                key={st.id}
                                type="monotone"
                                dataKey={st.name}
                                stroke={colors[idx % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}
        </TabsContent>

        {/* ── Reports Tab ───────────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-6 mt-4">
          {/* Report Templates */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  {t('grade_analytics.report_templates')}
                </CardTitle>
                <CardDescription>{t('grade_analytics.report_templates_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { type: 'quarterly', icon: Calendar, color: 'emerald' },
                    { type: 'semester', icon: Clock, color: 'teal' },
                    { type: 'annual', icon: FileText, color: 'amber' },
                    { type: 'custom', icon: Settings2, color: 'purple' },
                  ].map((template) => (
                    <motion.div
                      key={template.type}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-4 rounded-lg border cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                      onClick={() => {
                        setReportType(template.type);
                        setReportDialogOpen(true);
                      }}
                    >
                      <div className={`flex items-center gap-2 mb-2 text-${template.color}-600`}>
                        <template.icon className="h-5 w-5" />
                        <span className="font-medium text-sm">{t(`grade_analytics.${template.type}`)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t(`grade_analytics.${template.type}_desc`)}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Existing Reports */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  {t('grade_analytics.generated_reports')}
                </CardTitle>
                <CardDescription>{t('grade_analytics.generated_reports_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {reports.length > 0 ? (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {reports.map((report, idx) => (
                        <motion.div
                          key={report.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                        >
                          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted">
                            <FileText className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{report.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {report.generatedBy} • {new Date(report.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge
                            className={
                              report.type === 'quarterly' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-0' :
                              report.type === 'semester' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 border-0' :
                              report.type === 'annual' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-0' :
                              'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border-0'
                            }
                          >
                            {t(`grade_analytics.${report.type}`)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={
                              report.status === 'completed' ? 'border-emerald-300 text-emerald-700' :
                              report.status === 'pending' ? 'border-amber-300 text-amber-700' :
                              'border-red-300 text-red-700'
                            }
                          >
                            {report.status === 'completed' ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> {t('grade_analytics.completed')}</>
                            ) : report.status === 'pending' ? (
                              <><Clock className="h-3 w-3 mr-1" /> {t('grade_analytics.pending')}</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> {t('grade_analytics.failed')}</>
                            )}
                          </Badge>
                          {report.hasFileData && (
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center py-12 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t('grade_analytics.no_reports')}</p>
                    {(isAdmin || isTeacher) && (
                      <Button
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                        size="sm"
                        onClick={() => setReportDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('grade_analytics.generate_report')}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
