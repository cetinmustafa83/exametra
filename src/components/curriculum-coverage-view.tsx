'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  BookOpen,
  Users,
  Layers,
  TrendingUp,
  Clock,
  Search,
  ChevronRight,
  Sparkles,
  GraduationCap,
  AlertTriangle,
  PartyPopper,
  Sprout,
  Leaf,
  TreePine,
  Trees,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  fetchClasses,
  fetchSubjects,
  fetchCurriculumCoverage,
  type ClassGroup,
  type Subject,
  type CurriculumCoverage,
  type CurriculumCoverageCompetency,
} from '@/lib/api';

const STATUS_META: Record<
  'covered' | 'partial' | 'untouched',
  { icon: React.ElementType; bg: string; text: string; border: string }
> = {
  covered: {
    icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  partial: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  untouched: {
    icon: XCircle,
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
  },
};

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function MasteryIcon({ level }: { level: number | null }) {
  if (level === null || level === undefined) return <span className="text-lg">·</span>;
  if (level <= 1) return <Sprout className="w-5 h-5" />;
  if (level === 2) return <Leaf className="w-5 h-5" />;
  if (level === 3) return <TreePine className="w-5 h-5" />;
  return <Trees className="w-5 h-5" />;
}

export default function CurriculumCoverageView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolYearId = useAppStore((s) => s.schoolYearId);
  const storeClassId = useAppStore((s) => s.currentClassId);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const setCurrentClass = useAppStore((s) => s.setCurrentClass);
  const locale = currentUser?.locale ?? 'de';

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(storeClassId ?? '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [data, setData] = useState<CurriculumCoverage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter/sort state for matrix
  const [statusFilter, setStatusFilter] = useState<'all' | 'covered' | 'partial' | 'untouched'>('all');
  const [sortBy, setSortBy] = useState<'category' | 'status' | 'recent'>('category');
  const [searchQuery, setSearchQuery] = useState('');

  const [detailComp, setDetailComp] = useState<CurriculumCoverageCompetency | null>(null);

  // Load classes + subjects
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

  const loadCoverage = useCallback(async () => {
    if (!selectedClassId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const d = await fetchCurriculumCoverage({
        classGroupId: selectedClassId,
        subjectId: selectedSubjectId || undefined,
      });
      setData(d);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('coverage.error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSubjectId]);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage]);

  // Sync selected class back to store for cross-view consistency
  useEffect(() => {
    if (selectedClassId && selectedClassId !== storeClassId) {
      setCurrentClass(selectedClassId);
    }
  }, [selectedClassId, storeClassId, setCurrentClass]);

  // Filtered + sorted competency list
  const filteredCompetencies = useMemo(() => {
    if (!data) return [];
    let list = data.byCompetency.slice();
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) => c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'category') {
      list.sort((a, b) => a.categoryName.localeCompare(b.categoryName) || a.code.localeCompare(b.code));
    } else if (sortBy === 'status') {
      const order = { untouched: 0, partial: 1, covered: 2 };
      list.sort((a, b) => order[a.status] - order[b.status] || a.categoryName.localeCompare(b.categoryName));
    } else if (sortBy === 'recent') {
      list.sort((a, b) => {
        const aT = a.lastAssessedDate ? new Date(a.lastAssessedDate).getTime() : 0;
        const bT = b.lastAssessedDate ? new Date(b.lastAssessedDate).getTime() : 0;
        return bT - aT;
      });
    }
    return list;
  }, [data, statusFilter, sortBy, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {t('coverage.title')}
              </h2>
              <p className="text-sm text-muted-foreground">{t('coverage.subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadCoverage} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            {t('action.refresh')}
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <Card className="border-emerald-100 dark:border-emerald-900/30">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('label.class')}
              </label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger className="w-full rounded-xl border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 [&_svg]:opacity-100 [&_svg]:text-emerald-500">
                  <SelectValue placeholder={t('coverage.select_class')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      🏫 {c.name} · {c.schoolType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('label.subject')}
              </label>
              <Select
                value={selectedSubjectId || '__all__'}
                onValueChange={(v) => setSelectedSubjectId(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-full rounded-xl border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 [&_svg]:opacity-100 [&_svg]:text-emerald-500">
                  <SelectValue placeholder={t('coverage.select_subject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('coverage.select_subject')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content */}
      {!selectedClassId ? (
        <EmptyClassState />
      ) : loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCoverage} />
      ) : !data ? null : !data.hasAssignments ? (
        <NoAssignmentsState onGoToGrid={() => setCurrentView('competencies')} />
      ) : (
        <div className="space-y-6">
          {/* KPI tiles */}
          <KpiTiles data={data} />

          {/* Section 1: by category */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-emerald-600" />
                {t('coverage.section.by_category')}
              </CardTitle>
              <CardDescription>{t('coverage.section.by_category_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.byCategory.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t('coverage.no_data')}</p>
              ) : (
                data.byCategory.map((cat) => (
                  <CategoryBar key={cat.categoryId} cat={cat} />
                ))
              )}
            </CardContent>
          </Card>

          {/* Section 2: matrix */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="h-5 w-5 text-teal-600" />
                    {t('coverage.section.matrix')}
                  </CardTitle>
                  <CardDescription>{t('coverage.section.matrix_desc')}</CardDescription>
                </div>
              </div>
              {/* Filters */}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap gap-1">
                  {(['all', 'covered', 'partial', 'untouched'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        statusFilter === f
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'bg-muted hover:bg-emerald-100 dark:hover:bg-emerald-900/20 text-muted-foreground'
                      }`}
                    >
                      {t(`coverage.filter.${f}`)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('coverage.search_placeholder')}
                      className="pl-8 rounded-xl"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'category' | 'status' | 'recent')}>
                    <SelectTrigger className="w-[160px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">{t('coverage.sort.by_category')}</SelectItem>
                      <SelectItem value="status">{t('coverage.sort.by_status')}</SelectItem>
                      <SelectItem value="recent">{t('coverage.sort.by_recent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCompetencies.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t('coverage.no_data')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredCompetencies.map((comp, i) => (
                    <motion.div
                      key={comp.competencyId}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.4) }}
                    >
                      <CompetencyCard
                        comp={comp}
                        studentsCount={data.totals.studentsCount}
                        locale={locale}
                        onClick={() => setDetailComp(comp)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3 + 4: action needed + recent (2-col on desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Action needed */}
            <Card className="border-rose-100 dark:border-rose-900/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  {t('coverage.section.action_needed')}
                </CardTitle>
                <CardDescription>{t('coverage.section.action_needed_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.notAssessedList.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <PartyPopper className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto" />
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('coverage.empty_action')}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('coverage.empty_action_desc')}</p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {data.notAssessedList.slice(0, 10).map((c) => {
                      const meta = STATUS_META[c.status];
                      return (
                        <li
                          key={c.competencyId}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                        >
                          <span className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold ${meta.bg} ${meta.text}`}>
                            <meta.icon className="w-3.5 h-3.5" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {c.code}
                              </code>
                              <span className="text-xs truncate">{c.title}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {c.categoryName} · {c.studentsAssessed}/{c.studentsCount} {t('coverage.assessed_count').toLowerCase()}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                            onClick={() => {
                              setCurrentClass(selectedClassId);
                              setCurrentView('progress');
                            }}
                          >
                            {t('coverage.record_progress')}
                            <ChevronRight className="h-3 w-3 ml-0.5" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Recent */}
            <Card className="border-teal-100 dark:border-teal-900/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-teal-600" />
                  {t('coverage.section.recent')}
                </CardTitle>
                <CardDescription>{t('coverage.section.recent_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentAssessed.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <div className="text-3xl opacity-60">📭</div>
                    <p className="text-sm font-medium">{t('coverage.empty_recent')}</p>
                    <p className="text-xs text-muted-foreground">{t('coverage.empty_recent_desc')}</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {data.recentAssessed.map((r, idx) => (
                      <motion.li
                        key={r.competencyId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: idx * 0.05 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                      >
                        <MasteryIcon level={r.masteryLevelValue} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {r.code}
                            </code>
                            <span className="text-sm truncate">{r.title}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {r.categoryName} · {formatDate(r.date, locale)}
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!detailComp} onOpenChange={(v) => !v && setDetailComp(null)}>
        <DialogContent className="sm:max-w-md">
          {detailComp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-md ${STATUS_META[detailComp.status].bg} ${STATUS_META[detailComp.status].text}`}>
                    {(() => { const StatusIcon = STATUS_META[detailComp.status].icon; return <StatusIcon className="w-3.5 h-3.5" />; })()}
                  </span>
                  <code className="text-xs font-mono text-muted-foreground">{detailComp.code}</code>
                </DialogTitle>
                <DialogDescription className="text-base font-medium text-foreground">
                  {detailComp.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('coverage.assessed_count')}</span>
                  <Badge className={`${STATUS_META[detailComp.status].bg} ${STATUS_META[detailComp.status].text} ${STATUS_META[detailComp.status].border} border`}>
                    {detailComp.studentsAssessed} / {data?.totals.studentsCount ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('coverage.progress_count')}</span>
                  <span className="font-semibold">{detailComp.progressCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('coverage.assessments_count')}</span>
                  <span className="font-semibold">{detailComp.assessmentCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('coverage.last_assessed')}</span>
                  <span className="font-semibold">
                    {detailComp.lastAssessedDate ? formatDate(detailComp.lastAssessedDate, locale) : t('coverage.never_assessed')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('label.category')}</span>
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: detailComp.categoryColor,
                      color: detailComp.categoryColor,
                      backgroundColor: `${detailComp.categoryColor}15`,
                    }}
                  >
                    {detailComp.categoryName}
                  </Badge>
                </div>
                <Button
                  className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                  onClick={() => {
                    if (selectedClassId) setCurrentClass(selectedClassId);
                    setCurrentView('progress');
                  }}
                >
                  {t('coverage.record_progress')}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function KpiTiles({ data }: { data: CurriculumCoverage }) {
  const tiles = [
    {
      label: t('coverage.kpi.total'),
      value: data.totals.competencies,
      icon: Layers,
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: t('coverage.kpi.assessed'),
      value: `${data.totals.assessed} (${data.totals.coveragePercent}%)`,
      icon: CheckCircle2,
      gradient: 'from-teal-500 to-emerald-600',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      ring: true,
      coveragePercent: data.totals.coveragePercent,
    },
    {
      label: t('coverage.kpi.not_assessed'),
      value: `${data.totals.notAssessed} (${100 - data.totals.coveragePercent}%)`,
      icon: AlertCircle,
      gradient: 'from-rose-500 to-amber-500',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
    },
    {
      label: t('coverage.kpi.students'),
      value: data.totals.studentsCount,
      icon: Users,
      gradient: 'from-amber-500 to-violet-500',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
    },
  ];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          <Card className={`${tile.bg} border-0 shadow-sm`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 leading-tight">
                    {tile.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight">{tile.value}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tile.ring && (
                    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
                        strokeDasharray={`${(tile.coveragePercent! / 100) * 2 * Math.PI * 16} ${2 * Math.PI * 16}`}
                        strokeLinecap="round"
                        transform="rotate(-90 20 20)"
                      />
                      <text
                        x="20"
                        y="20"
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[9px] font-bold fill-emerald-700 dark:fill-emerald-300"
                      >
                        {tile.coveragePercent}%
                      </text>
                    </svg>
                  )}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${tile.gradient} text-white shadow-md shrink-0`}>
                    <tile.icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function CategoryBar({
  cat,
}: {
  cat: CurriculumCoverage['byCategory'][number];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: cat.categoryColor }}
          />
          <span className="font-medium truncate">{cat.categoryName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <span>{cat.assessed}/{cat.total}</span>
          <span className="font-semibold" style={{ color: cat.categoryColor }}>
            {cat.coveragePercent}%
          </span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${cat.coveragePercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: cat.categoryColor }}
        />
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${100 - cat.coveragePercent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-muted-foreground/15"
        />
      </div>
    </div>
  );
}

function CompetencyCard({
  comp,
  studentsCount,
  locale,
  onClick,
}: {
  comp: CurriculumCoverageCompetency;
  studentsCount: number;
  locale: string;
  onClick: () => void;
}) {
  const meta = STATUS_META[comp.status];
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all bg-card"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {comp.code}
            </code>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.text} border ${meta.border}`}>
              <meta.icon className="w-3 h-3 inline mr-0.5" /> {t(`coverage.status.${comp.status}`)}
            </span>
          </div>
          <p className="text-sm font-medium leading-tight line-clamp-2">{comp.title}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: `${comp.categoryColor}20`, color: comp.categoryColor }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: comp.categoryColor }} />
            {comp.categoryName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {comp.studentsAssessed}/{studentsCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {comp.lastAssessedDate ? formatDate(comp.lastAssessedDate, locale) : '—'}
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyClassState() {
  return (
    <Card className="border-dashed border-emerald-200 dark:border-emerald-900/40">
      <CardContent className="py-12">
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('coverage.select_class')}</h3>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">{t('coverage.guide.subtitle')}</p>
              <h4 className="text-base font-semibold flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t('coverage.guide.title')}
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { num: 1, icon: Users, title: t('coverage.guide.step1_title'), desc: t('coverage.guide.step1_desc'), gradient: 'from-emerald-500 to-teal-600' },
                { num: 2, icon: BookOpen, title: t('coverage.guide.step2_title'), desc: t('coverage.guide.step2_desc'), gradient: 'from-teal-500 to-emerald-600' },
                { num: 3, icon: Target, title: t('coverage.guide.step3_title'), desc: t('coverage.guide.step3_desc'), gradient: 'from-amber-500 to-violet-500' },
              ].map((step) => (
                <div
                  key={step.num}
                  className="relative p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10"
                >
                  <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md">
                    {step.num}
                  </div>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${step.gradient} text-white shadow-md mb-3`}>
                    <step.icon className="h-4 w-4" />
                  </div>
                  <h5 className="font-semibold text-sm mb-1">{step.title}</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NoAssignmentsState({ onGoToGrid }: { onGoToGrid: () => void }) {
  return (
    <Card className="border-dashed border-amber-200 dark:border-amber-900/40">
      <CardContent className="py-12 text-center space-y-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xl">
          <BookOpen className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">{t('coverage.no_assignments')}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('coverage.no_assignments_desc')}
          </p>
        </div>
        <Button
          onClick={onGoToGrid}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
        >
          {t('coverage.go_to_grid')}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Card>
        <CardContent className="p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-rose-200 dark:border-rose-900/40">
      <CardContent className="py-12 text-center space-y-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
          <XCircle className="h-7 w-7" />
        </div>
        <div>
          <h3 className="font-semibold">{t('coverage.error')}</h3>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-1" />
          {t('action.refresh')}
        </Button>
      </CardContent>
    </Card>
  );
}
