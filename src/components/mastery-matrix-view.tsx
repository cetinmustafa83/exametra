'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Grid3X3,
  RefreshCw,
  Download,
  Layers,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  Calendar,
  BookOpen,
  ListChecks,
  Sprout,
  Leaf,
  TreePine,
  Trees,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchMasteryMatrix,
  fetchClasses,
  fetchSubjects,
  fetchLearningProgress,
  type MasteryMatrixData,
  type ClassGroup,
  type Subject,
  type LearningProgressEntry,
} from '@/lib/api';
import { toast } from 'sonner';

function masteryCellColor(level: number | null): string {
  if (level === null) return 'bg-gray-100 dark:bg-gray-800/60 text-gray-400';
  if (level <= 1) return 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200';
  if (level <= 2) return 'bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200';
  if (level <= 3) return 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200';
  return 'bg-teal-200 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200';
}

function avgColor(avg: number): string {
  if (avg <= 0) return 'text-gray-400';
  if (avg < 2) return 'text-rose-600 dark:text-rose-400';
  if (avg < 3) return 'text-amber-600 dark:text-amber-400';
  if (avg < 3.5) return 'text-emerald-600 dark:text-emerald-400';
  return 'text-teal-600 dark:text-teal-400';
}

function escapeCsv(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function MasteryMatrixView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolYearId = useAppStore((s) => s.schoolYearId);
  const storeClassId = useAppStore((s) => s.currentClassId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(storeClassId ?? '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [data, setData] = useState<MasteryMatrixData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ studentName: string; competencyCode: string; competencyTitle: string; entries: LearningProgressEntry[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load classes + subjects for filters
  useEffect(() => {
    async function load() {
      try {
        const [cls, subs] = await Promise.all([
          fetchClasses(currentUser?.schoolId ?? undefined, schoolYearId ?? undefined).catch(() => []),
          fetchSubjects(currentUser?.schoolId ?? undefined).catch(() => []),
        ]);
        setClasses(cls);
        setSubjects(subs);
        if (!selectedClassId && cls.length > 0) {
          setSelectedClassId(cls[0].id);
        }
      } catch {
        // ignore
      }
    }
    load();
  }, [currentUser?.schoolId, schoolYearId]);

  const loadMatrix = React.useCallback(async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await fetchMasteryMatrix({
        classGroupId: selectedClassId,
        subjectId: selectedSubjectId,
      });
      setData(d);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.generic');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Build matrix lookup map: `${studentId}::${competencyId}` -> cell
  const matrixMap = useMemo(() => {
    const m = new Map<string, { level: number | null; count: number; lastDate: string | null }>();
    if (data) {
      for (const cell of data.matrix) {
        m.set(`${cell.studentId}::${cell.competencyId}`, {
          level: cell.latestMasteryLevel,
          count: cell.entryCount,
          lastDate: cell.lastEntryDate,
        });
      }
    }
    return m;
  }, [data]);

  // Row averages (per student) and column averages (per competency)
  const rowAverages = useMemo(() => {
    if (!data) return new Map<string, number>();
    const m = new Map<string, { total: number; count: number }>();
    for (const student of data.students) {
      m.set(student.id, { total: 0, count: 0 });
    }
    for (const cell of data.matrix) {
      if (cell.latestMasteryLevel !== null) {
        const cur = m.get(cell.studentId);
        if (cur) {
          cur.total += cell.latestMasteryLevel;
          cur.count += 1;
        }
      }
    }
    const result = new Map<string, number>();
    for (const [sid, v] of m) {
      result.set(sid, v.count > 0 ? Math.round((v.total / v.count) * 100) / 100 : 0);
    }
    return result;
  }, [data]);

  const colAverages = useMemo(() => {
    if (!data) return new Map<string, number>();
    const m = new Map<string, { total: number; count: number }>();
    for (const comp of data.competencies) {
      m.set(comp.id, { total: 0, count: 0 });
    }
    for (const cell of data.matrix) {
      if (cell.latestMasteryLevel !== null) {
        const cur = m.get(cell.competencyId);
        if (cur) {
          cur.total += cell.latestMasteryLevel;
          cur.count += 1;
        }
      }
    }
    const result = new Map<string, number>();
    for (const [cid, v] of m) {
      result.set(cid, v.count > 0 ? Math.round((v.total / v.count) * 100) / 100 : 0);
    }
    return result;
  }, [data]);

  const overallAvg = useMemo(() => {
    if (!data || data.matrix.length === 0) return 0;
    const assessed = data.matrix.filter((c) => c.latestMasteryLevel !== null);
    if (assessed.length === 0) return 0;
    return Math.round((assessed.reduce((s, c) => s + (c.latestMasteryLevel ?? 0), 0) / assessed.length) * 100) / 100;
  }, [data]);

  // Total entries across all cells
  const totalEntries = useMemo(() => {
    if (!data) return 0;
    return data.matrix.reduce((s, c) => s + c.entryCount, 0);
  }, [data]);

  // Coverage %: how many cells have at least one entry
  const coveragePct = useMemo(() => {
    if (!data || data.students.length === 0 || data.competencies.length === 0) return 0;
    const totalCells = data.students.length * data.competencies.length;
    if (totalCells === 0) return 0;
    const assessed = data.matrix.filter((c) => c.latestMasteryLevel !== null).length;
    return Math.round((assessed / totalCells) * 100);
  }, [data]);

  // Mastery distribution across the whole matrix (count per level)
  const masteryDist = useMemo(() => {
    if (!data) return [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];
    for (const cell of data.matrix) {
      if (cell.latestMasteryLevel !== null && cell.latestMasteryLevel >= 1 && cell.latestMasteryLevel <= 4) {
        counts[cell.latestMasteryLevel - 1] += 1;
      }
    }
    return counts;
  }, [data]);

  const handleCellClick = async (studentId: string, competencyId: string) => {
    if (!data) return;
    const student = data.students.find((s) => s.id === studentId);
    const comp = data.competencies.find((c) => c.id === competencyId);
    if (!student || !comp) return;
    setDetailLoading(true);
    setDetail({
      studentName: `${student.firstName} ${student.lastName}`,
      competencyCode: comp.code,
      competencyTitle: comp.title,
      entries: [],
    });
    try {
      const entries = await fetchLearningProgress({
        studentId,
        competencyId,
      });
      setDetail({
        studentName: `${student.firstName} ${student.lastName}`,
        competencyCode: comp.code,
        competencyTitle: comp.title,
        entries,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.generic');
      toast.error(msg);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    const header = [
      t('matrix.student'),
      ...data.competencies.map((c) => c.code),
      t('matrix.row_avg'),
    ];
    let csv = header.map(escapeCsv).join(',') + '\n';
    for (const s of data.students) {
      const row: (string | number)[] = [`${s.firstName} ${s.lastName}`];
      for (const c of data.competencies) {
        const cell = matrixMap.get(`${s.id}::${c.id}`);
        row.push(cell?.level ?? '');
      }
      row.push(rowAverages.get(s.id) ?? 0);
      csv += row.map(escapeCsv).join(',') + '\n';
    }
    // Column averages row
    const avgRow: (string | number)[] = [t('matrix.col_avg')];
    for (const c of data.competencies) {
      avgRow.push(colAverages.get(c.id) ?? 0);
    }
    avgRow.push(overallAvg);
    csv += avgRow.map(escapeCsv).join(',') + '\n';

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mastery_matrix_${selectedClassId}_${selectedSubjectId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('matrix.export_success'));
  };

  const hasFilters = selectedClassId && selectedSubjectId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden relative">
          {/* Decorative gradient banner */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100/40 via-emerald-50/30 to-violet-100/40 dark:from-teal-900/15 dark:via-emerald-900/10 dark:to-violet-900/15 pointer-events-none" />
          <div className="absolute inset-0 bg-pattern-grid opacity-30 pointer-events-none" />
          <CardContent className="p-5 relative">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white ring-2 ring-teal-200/60 dark:ring-teal-800/40 shadow-lg shadow-teal-300/30 dark:shadow-teal-900/40">
                <Grid3X3 className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold gradient-text">{t('matrix.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">{t('matrix.subtitle')}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 backdrop-blur-sm bg-white/60 dark:bg-gray-900/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  onClick={loadMatrix}
                  disabled={loading || !hasFilters}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  {t('analytics.refresh')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 backdrop-blur-sm bg-white/60 dark:bg-gray-900/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                  onClick={handleExportCsv}
                  disabled={!data || data.students.length === 0}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  {t('matrix.export_csv')}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-teal-600/70 dark:text-teal-400/50 font-semibold">
                  {t('matrix.select_class')}
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-8 w-44 rounded-lg text-xs border-teal-200 dark:border-teal-900/30">
                    <SelectValue placeholder={t('matrix.select_class')} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-teal-600/70 dark:text-teal-400/50 font-semibold">
                  {t('matrix.select_subject')}
                </label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="h-8 w-44 rounded-lg text-xs border-teal-200 dark:border-teal-900/30">
                    <SelectValue placeholder={t('matrix.select_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary banner */}
            {data && (
              <div className="mt-4 p-4 rounded-xl bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm border border-teal-200/40 dark:border-teal-900/30">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {/* Class average */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm shrink-0">
                      <Grid3X3 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-teal-600/70 dark:text-teal-400/60 font-semibold">{t('matrix.avg')}</p>
                      <p className={`text-lg font-bold ${avgColor(overallAvg)}`}>{overallAvg > 0 ? overallAvg.toFixed(2) : '—'}</p>
                    </div>
                  </div>
                  {/* Total entries */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shrink-0">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/60 font-semibold">{t('matrix.entries')}</p>
                      <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{totalEntries}</p>
                    </div>
                  </div>
                  {/* Coverage */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/60 font-semibold">{t('polish.coverage')}</p>
                      <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{coveragePct}%</p>
                    </div>
                  </div>
                  {/* Mastery distribution mini bar chart */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-rose-500 text-white shadow-sm shrink-0">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-violet-600/70 dark:text-violet-400/60 font-semibold">{t('polish.mastery_distribution')}</p>
                      <div className="flex items-end gap-0.5 h-5 mt-0.5">
                        {masteryDist.map((cnt, i) => {
                          const max = Math.max(...masteryDist, 1);
                          const h = (cnt / max) * 100;
                          const colors = ['bg-red-400 dark:bg-red-500', 'bg-amber-400 dark:bg-amber-500', 'bg-emerald-400 dark:bg-emerald-500', 'bg-teal-400 dark:bg-teal-500'];
                          return (
                            <div
                              key={i}
                              className={`flex-1 rounded-t-sm transition-all hover:brightness-110 ${colors[i]}`}
                              style={{ height: `${Math.max(h, 8)}%` }}
                              title={`${t('polish.level_' + (i + 1))}: ${cnt}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {!hasFilters ? (
        <div className="space-y-4">
          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="py-16 text-center">
              <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 mx-auto mb-5 shadow-md shadow-teal-200/40 dark:shadow-teal-900/20">
                <Grid3X3 className="h-10 w-10 text-teal-500 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_matrix')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('polish.empty_subtitle_matrix')}</p>
            </CardContent>
          </Card>

          {/* How it works — 3-step guide */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-400 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                  <ListChecks className="h-4 w-4" />
                </div>
                {t('polish.matrix_how_it_works_title')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('polish.matrix_how_it_works_subtitle')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Step 1 */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0 border border-emerald-100/60 dark:border-emerald-900/30">
                  <span className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 text-white text-xs font-bold shadow-sm">
                    1
                  </span>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300">
                      <Users className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('polish.matrix_step_1_title')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {t('polish.matrix_step_1_desc')}
                  </p>
                </div>
                {/* Step 2 */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-teal-50/60 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0 border border-teal-100/60 dark:border-teal-900/30">
                  <span className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-teal-500 text-white text-xs font-bold shadow-sm">
                    2
                  </span>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {t('polish.matrix_step_2_title')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {t('polish.matrix_step_2_desc')}
                  </p>
                </div>
                {/* Step 3 */}
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-amber-50/60 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0 border border-amber-100/60 dark:border-amber-900/30">
                  <span className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white text-xs font-bold shadow-sm">
                    3
                  </span>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300">
                      <Grid3X3 className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {t('polish.matrix_step_3_title')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {t('polish.matrix_step_3_desc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : loading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : error ? (
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="py-12 text-center">
            <p className="text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={loadMatrix}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('analytics.refresh')}
            </Button>
          </CardContent>
        </Card>
      ) : !data ? null : data.competencies.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="py-16 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/20 mx-auto mb-5 shadow-md shadow-rose-200/40 dark:shadow-rose-900/20">
              <XCircle className="h-10 w-10 text-rose-500 dark:text-rose-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('matrix.no_template_hint')}</p>
          </CardContent>
        </Card>
      ) : data.students.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="py-16 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 mx-auto mb-5 shadow-md shadow-teal-200/40 dark:shadow-teal-900/20">
              <Users className="h-10 w-10 text-teal-500 dark:text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('matrix.no_students')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Grid3X3 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              {t('matrix.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-education">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="border-b-2 border-teal-300/40 dark:border-teal-900/40 sticky top-0 z-10 bg-gradient-to-r from-teal-50 via-white to-emerald-50/30 dark:from-teal-900/30 dark:via-gray-950 dark:to-emerald-900/10 shadow-sm">
                    <TableHead className="text-xs uppercase text-teal-600/80 dark:text-teal-400/60 sticky left-0 bg-inherit z-20 min-w-[140px] font-bold tracking-wider">
                      {t('matrix.student')}
                    </TableHead>
                    {data.competencies.map((c) => (
                      <TableHead
                        key={c.id}
                        className="text-center text-[10px] uppercase text-teal-600/70 dark:text-teal-400/50 min-w-[60px] max-w-[80px] px-2 hover:bg-teal-100/40 dark:hover:bg-teal-900/20 transition-colors"
                        title={`${c.code} — ${c.title}`}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono font-semibold truncate w-full text-center">{c.code}</span>
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full ring-1 ring-white dark:ring-gray-900"
                            style={{ backgroundColor: c.category.color ?? '#94a3b8' }}
                            title={c.category.name}
                          />
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-xs uppercase text-emerald-600/80 dark:text-emerald-400/60 sticky right-0 bg-inherit z-20 min-w-[60px] text-center font-bold tracking-wider">
                      {t('matrix.row_avg')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((s, sIdx) => {
                    const rowAvg = rowAverages.get(s.id) ?? 0;
                    return (
                      <TableRow
                        key={s.id}
                        className={sIdx % 2 === 1 ? 'bg-teal-50/20 dark:bg-teal-900/5 hover:bg-teal-50/40 dark:hover:bg-teal-900/10' : 'hover:bg-teal-50/30 dark:hover:bg-teal-900/8'}
                      >
                        <TableCell className="font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-inherit z-10 min-w-[140px]">
                          {s.firstName} {s.lastName}
                        </TableCell>
                        {data.competencies.map((c) => {
                          const cell = matrixMap.get(`${s.id}::${c.id}`);
                          const level = cell?.level ?? null;
                          const lastDate = cell?.lastDate;
                          const dateStr = lastDate ? new Date(lastDate).toLocaleDateString() : null;
                          const count = cell?.count ?? 0;
                          return (
                            <TableCell
                              key={c.id}
                              className="p-1 text-center"
                            >
                              <button
                                onClick={() => handleCellClick(s.id, c.id)}
                                className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold transition-all hover:scale-110 hover:shadow-md hover:ring-2 hover:ring-emerald-300/60 dark:hover:ring-emerald-700/40 cursor-pointer border border-white/40 dark:border-gray-800/40 ${masteryCellColor(level)}`}
                                title={
                                  level !== null
                                    ? `${c.code} · ${t('analytics.level')} ${level}\n${t('matrix.last_entry')}: ${dateStr ?? '—'}\n${count} ${t('analytics.entry_count')}`
                                    : `${c.code} · ${t('matrix.legend_unassessed')}`
                                }
                              >
                                {level ?? '—'}
                              </button>
                            </TableCell>
                          );
                        })}
                        <TableCell className="sticky right-0 bg-inherit z-10 text-center min-w-[60px]">
                          <span className={`text-sm font-bold ${avgColor(rowAvg)}`}>
                            {rowAvg > 0 ? rowAvg.toFixed(2) : '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* Column averages row */}
                  <TableRow className="border-t-2 border-emerald-300/40 dark:border-emerald-900/40 bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-900/15 dark:to-teal-900/10">
                    <TableCell className="sticky left-0 bg-inherit z-10 font-bold text-emerald-700 dark:text-emerald-300 text-xs uppercase">
                      {t('matrix.col_avg')}
                    </TableCell>
                    {data.competencies.map((c) => {
                      const avg = colAverages.get(c.id) ?? 0;
                      return (
                        <TableCell key={c.id} className="text-center p-1">
                          <span className={`text-xs font-semibold ${avgColor(avg)}`}>
                            {avg > 0 ? avg.toFixed(1) : '—'}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="sticky right-0 bg-inherit z-10 text-center">
                      <span className={`text-sm font-bold ${avgColor(overallAvg)}`}>
                        {overallAvg > 0 ? overallAvg.toFixed(2) : '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* Enhanced Legend */}
            <div className="p-4 border-t border-teal-200/40 dark:border-teal-900/30 bg-gradient-to-r from-emerald-50/30 to-teal-50/20 dark:from-emerald-900/10 dark:to-teal-900/10">
              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                <span className="font-semibold uppercase tracking-wider text-teal-600/80 dark:text-teal-400/60 inline-flex items-center gap-1.5">
                  <Layers className="h-3 w-3" />
                  {t('matrix.legend')}:
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/30">
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700 ring-1 ring-white dark:ring-gray-900" />
                  <span className="text-gray-600 dark:text-gray-300">{t('matrix.legend_unassessed')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/30">
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-200 dark:bg-red-900/40 ring-1 ring-white dark:ring-gray-900" />
                  <span className="text-red-700 dark:text-red-300 flex items-center gap-1"><Sprout className="w-3.5 h-3.5" /> {t('matrix.legend_level_1')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/30">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-200 dark:bg-amber-900/40 ring-1 ring-white dark:ring-gray-900" />
                  <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1"><Leaf className="w-3.5 h-3.5" /> {t('matrix.legend_level_2')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/30">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900/40 ring-1 ring-white dark:ring-gray-900" />
                  <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1"><TreePine className="w-3.5 h-3.5" /> {t('matrix.legend_level_3')}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 dark:bg-gray-800/40 border border-gray-200/40 dark:border-gray-700/30">
                  <span className="inline-block w-3 h-3 rounded-sm bg-teal-200 dark:bg-teal-900/40 ring-1 ring-white dark:ring-gray-900" />
                  <span className="text-teal-700 dark:text-teal-300 flex items-center gap-1"><Trees className="w-3.5 h-3.5" /> {t('matrix.legend_level_4')}</span>
                </span>
                <span className="ml-auto text-[10px] text-gray-500 dark:text-gray-400 italic">
                  {t('polish.matrix_click_hint')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl rounded-2xl border-emerald-200/60 dark:border-emerald-900/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5" />
              {detail?.competencyCode} — {detail?.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              {detail?.competencyTitle} · {t('matrix.entries_for')} {detail?.studentName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-education">
            {detailLoading ? (
              <Skeleton className="h-24 rounded-lg" />
            ) : detail && detail.entries.length > 0 ? (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-300 via-teal-300 to-amber-300 dark:from-emerald-700 dark:via-teal-700 dark:to-amber-700" />
                {detail.entries.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pl-8 pb-2 group"
                  >
                    <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${
                      e.masteryLevelValue <= 1 ? 'bg-red-500'
                      : e.masteryLevelValue <= 2 ? 'bg-amber-500'
                      : e.masteryLevelValue <= 3 ? 'bg-emerald-500'
                      : 'bg-teal-500'
                    }`} style={{ zIndex: 1 }} />
                    <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/15 dark:to-transparent border-l-2 border-emerald-300/50 dark:border-emerald-700/40 hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${masteryCellColorBadge(e.masteryLevelValue)}`}>
                          {e.masteryLevelValue <= 1 ? <Sprout className="w-3 h-3 inline text-red-500" /> : e.masteryLevelValue <= 2 ? <Leaf className="w-3 h-3 inline text-amber-500" /> : e.masteryLevelValue <= 3 ? <TreePine className="w-3 h-3 inline text-emerald-500" /> : <Trees className="w-3 h-3 inline text-teal-500" />} {t('analytics.level')} {e.masteryLevelValue}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-emerald-400" />
                          {new Date(e.date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-emerald-600/70 dark:text-emerald-400/50">
                          — {e.teacher.firstName} {e.teacher.lastName}
                        </span>
                      </div>
                      {e.note && (
                        <p className="text-xs italic text-gray-700 dark:text-gray-300 mt-1.5 bg-amber-50/40 dark:bg-amber-900/5 px-2 py-1 rounded">"{e.note}"</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <XCircle className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('matrix.no_entries_for')}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function masteryCellColorBadge(level: number): string {
  if (level <= 1) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  if (level <= 2) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (level <= 3) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
}
