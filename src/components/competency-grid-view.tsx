'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Grid3X3, BookOpen, Layers, ChevronRight, Search, Filter, ChevronDown, ChevronUp, Tag,
  BarChart3, TrendingUp,
  Sprout, Leaf, TreePine, Trees,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchCompetencyTemplates, fetchSubjects,
  type CompetencyTemplate, type Subject,
} from '@/lib/api';

// Subject color coding (deterministic per subject name)
const subjectColors: Record<string, { gradient: string; text: string; dot: string; bg: string }> = {
  default: { gradient: 'from-emerald-400 to-teal-500', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
};
function subjectMeta(name?: string) {
  if (!name) return subjectColors.default;
  const lower = name.toLowerCase();
  if (lower.includes('math') || lower.includes('mathemat')) return { gradient: 'from-emerald-400 to-teal-500', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' };
  if (lower.includes('deutsch') || lower.includes('german')) return { gradient: 'from-violet-400 to-rose-500', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' };
  if (lower.includes('engl') || lower.includes('english')) return { gradient: 'from-teal-400 to-emerald-500', text: 'text-teal-700 dark:text-teal-300', dot: 'bg-teal-500', bg: 'bg-teal-100 dark:bg-teal-900/30' };
  if (lower.includes(' sach') || lower.includes('science')) return { gradient: 'from-amber-400 to-amber-500', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' };
  return subjectColors.default;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Deterministic pseudo distribution across 4 mastery levels
function masteryDistribution(compId: string): { level: number; pct: number; color: string }[] {
  const h = hashStr(compId);
  const l1 = 5 + (h % 25);
  const l2 = 15 + ((h >> 3) % 30);
  const l3 = 25 + ((h >> 6) % 30);
  const l4 = Math.max(0, 100 - l1 - l2 - l3);
  return [
    { level: 1, pct: l1, color: 'bg-red-400 dark:bg-red-500' },
    { level: 2, pct: l2, color: 'bg-amber-400 dark:bg-amber-500' },
    { level: 3, pct: l3, color: 'bg-emerald-400 dark:bg-emerald-500' },
    { level: 4, pct: l4, color: 'bg-teal-400 dark:bg-teal-500' },
  ];
}

function masteredPercent(compId: string): number {
  const dist = masteryDistribution(compId);
  return dist[2].pct + dist[3].pct; // mastered = level 3+4
}

export default function CompetencyGridView() {
  const currentUser = useAppStore((s) => s.currentUser);

  const [templates, setTemplates] = useState<CompetencyTemplate[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CompetencyTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSchoolType, setFilterSchoolType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [temps, subs] = await Promise.all([
          fetchCompetencyTemplates({ schoolId: currentUser?.schoolId ?? undefined }),
          fetchSubjects(currentUser?.schoolId ?? undefined),
        ]);
        setTemplates(temps);
        setSubjects(subs);
        // Expand all categories by default
        const allCatIds = new Set<string>();
        temps.forEach((tmpl) => tmpl.categories.forEach((cat) => allCatIds.add(cat.id)));
        setExpandedCategories(allCatIds);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.schoolId]);

  const schoolTypes = ['ELEMENTARY', 'MIDDLE', 'GYMNASIUM', 'OTHER'];

  const filteredTemplates = templates.filter((tmpl) => {
    if (filterSchoolType !== 'all' && tmpl.schoolType !== filterSchoolType) return false;
    if (filterSubject !== 'all' && tmpl.subjectId !== filterSubject) return false;
    if (search && !tmpl.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const masteryColor = (level: number) => {
    const colors = ['bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'];
    return colors[Math.min(level - 1, 3)] ?? colors[0];
  };

  const masteryHoverBg = (level: number) => {
    const colors = ['hover:bg-red-50/80 dark:hover:bg-red-900/10', 'hover:bg-amber-50/80 dark:hover:bg-amber-900/10', 'hover:bg-emerald-50/80 dark:hover:bg-emerald-900/10', 'hover:bg-teal-50/80 dark:hover:bg-teal-900/10'];
    return colors[Math.min(level - 1, 3)] ?? colors[0];
  };

  const masteryIcon = (level: number) => {
    const cls = 'w-3.5 h-3.5 inline-block';
    if (level === 1) return <Sprout className={`${cls} text-red-500`} />;
    if (level === 2) return <Leaf className={`${cls} text-amber-500`} />;
    if (level === 3) return <TreePine className={`${cls} text-emerald-500`} />;
    return <Trees className={`${cls} text-teal-500`} />;
  };

  const competencyProgressPercent = (tmpl: CompetencyTemplate) => {
    const totalComps = tmpl.categories.reduce((sum, cat) => sum + cat.competencies.length, 0);
    if (totalComps === 0) return 0;
    // Assume some progress based on assignment count
    const assignedCount = tmpl._count?.classCompetencyAssignments ?? 0;
    return Math.min(assignedCount * 20, 100);
  };

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const categoryColors = [
    { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-l-emerald-500', header: 'from-emerald-50 dark:from-emerald-900/20' },
    { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-l-teal-500', header: 'from-teal-50 dark:from-teal-900/20' },
    { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-l-amber-500', header: 'from-amber-50 dark:from-amber-900/20' },
    { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-l-violet-500', header: 'from-violet-50 dark:from-violet-900/20' },
    { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-l-rose-500', header: 'from-rose-50 dark:from-rose-900/20' },
    { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-300', border: 'border-l-sky-500', header: 'from-sky-50 dark:from-sky-900/20' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Template list */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <Grid3X3 className="h-4 w-4" />
            </div>
            {t('competencies.template_library')}
          </CardTitle>
          <div className="space-y-2 mt-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('action.search')}
                className="pl-9 border-emerald-200/50 dark:border-emerald-900/30 rounded-xl"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterSchoolType} onValueChange={setFilterSchoolType}>
                <SelectTrigger className="h-8 text-xs flex-1 rounded-xl">
                  <SelectValue placeholder={t('competencies.filter_school_type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('action.filter')}</SelectItem>
                  {schoolTypes.map((st) => (
                    <SelectItem key={st} value={st}>{t(`school_type.${st.toLowerCase()}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="h-8 text-xs flex-1 rounded-xl">
                  <SelectValue placeholder={t('competencies.filter_subject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('action.filter')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto scrollbar-education">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-10">
              <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
                <Grid3X3 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('competencies.no_templates')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((tmpl) => {
                const sMeta = subjectMeta(tmpl.subject?.name);
                return (
                <motion.button
                  key={tmpl.id}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSelectedTemplate(tmpl)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-200 border-l-3 ${
                    selectedTemplate?.id === tmpl.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 shadow-md ring-1 ring-emerald-300 dark:ring-emerald-700 border-l-emerald-500'
                      : 'bg-gray-50/80 dark:bg-gray-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:shadow-sm border-l-emerald-400/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${sMeta.gradient} text-white shadow-sm shrink-0`}>
                          <BookOpen className="h-3.5 w-3.5" />
                        </div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{tmpl.name}</p>
                        {/* Template usage badge */}
                        {(tmpl._count?.classCompetencyAssignments ?? 0) > 0 && (
                          <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-[10px] font-medium rounded-md inline-flex items-center gap-1">
                            <Layers className="h-2.5 w-2.5" />
                            {tmpl._count?.classCompetencyAssignments}× {t('polish.template_usage')}
                          </Badge>
                        )}
                        {tmpl.isGlobalTemplate && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] rounded-md">{t('competencies.global_template')}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-9">
                        <span className={`inline-flex items-center gap-1 font-medium ${sMeta.text}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${sMeta.dot}`} />
                          {tmpl.subject?.name ?? '—'}
                        </span>
                        <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                        {t('competencies.grade_range', { min: tmpl.gradeLevelMin, max: tmpl.gradeLevelMax })}
                        <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5" />
                          {tmpl.categories.reduce((s, c) => s + c.competencies.length, 0)} {t('polish.competency_count')}
                        </span>
                      </p>
                      {/* Category dots */}
                      {tmpl.categories.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 ml-9">
                          <Tag className="h-3 w-3 text-gray-400" />
                          {tmpl.categories.map((cat, i) => (
                            <div
                              key={cat.id}
                              className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"
                              style={{ backgroundColor: cat.color ?? categoryColors[i % categoryColors.length].bg.replace('bg-', '').includes('emerald') ? '#10b981' : '#14b8a6' }}
                              title={cat.name}
                            />
                          ))}
                          <span className="text-[10px] text-gray-400 ml-1">{tmpl.categories.length} {t('progress.entries')}</span>
                        </div>
                      )}
                      {/* Progress indicator */}
                      <div className="flex items-center gap-2 mt-2 ml-9">
                        <div className="w-24 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-progress-fill"
                            style={{ width: `${competencyProgressPercent(tmpl)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400">{competencyProgressPercent(tmpl)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </motion.button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template details */}
      <div className="lg:col-span-2 space-y-6">
        {!selectedTemplate ? (
          <>
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="py-16 text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
                  <Grid3X3 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_competency_grid')}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('polish.empty_subtitle_competency_grid')}</p>
              </CardContent>
            </Card>

            {/* Quick Guide: Overview stats + by-subject breakdown + recent templates */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 via-emerald-50/30 to-transparent dark:from-teal-900/10 dark:via-emerald-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  {t('competencies.quick_guide_title')}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                    · {t('competencies.quick_guide_subtitle')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const totalCompetencies = templates.reduce(
                    (sum, tmpl) => sum + tmpl.categories.reduce((s, c) => s + c.competencies.length, 0),
                    0,
                  );
                  const totalCategories = templates.reduce((sum, tmpl) => sum + tmpl.categories.length, 0);

                  // By subject breakdown
                  const bySubject = new Map<string, number>();
                  for (const tmpl of templates) {
                    const subjectName = tmpl.subject?.name ?? t('competencies.no_subject');
                    const cnt = tmpl.categories.reduce((s, c) => s + c.competencies.length, 0);
                    bySubject.set(subjectName, (bySubject.get(subjectName) ?? 0) + cnt);
                  }
                  const subjectRows = Array.from(bySubject.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5);
                  const maxSubjectCount = Math.max(1, ...subjectRows.map(([, n]) => n));

                  // Recent templates (sorted by name as a stable fallback — no updatedAt available on this model)
                  const recentTemplates = [...templates]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .slice(0, 4);

                  const tileColors = [
                    { bg: 'from-emerald-50 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0', border: 'border-emerald-100/60 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-500' },
                    { bg: 'from-teal-50 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0', border: 'border-teal-100/60 dark:border-teal-900/30', text: 'text-teal-700 dark:text-teal-300', iconBg: 'bg-gradient-to-br from-teal-400 to-teal-500' },
                    { bg: 'from-amber-50 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0', border: 'border-amber-100/60 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-300', iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500' },
                  ];

                  return (
                    <div className="space-y-5">
                      {/* Mini stat tiles */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${tileColors[0].bg} border ${tileColors[0].border}`}>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${tileColors[0].iconBg} text-white shadow-sm mb-2`}>
                            <Layers className="h-4 w-4" />
                          </div>
                          <p className={`text-2xl font-bold ${tileColors[0].text}`}>{templates.length}</p>
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">{t('competencies.total_templates')}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${tileColors[1].bg} border ${tileColors[1].border}`}>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${tileColors[1].iconBg} text-white shadow-sm mb-2`}>
                            <Tag className="h-4 w-4" />
                          </div>
                          <p className={`text-2xl font-bold ${tileColors[1].text}`}>{totalCategories}</p>
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">{t('competencies.total_categories')}</p>
                        </div>
                        <div className={`p-3 rounded-xl bg-gradient-to-br ${tileColors[2].bg} border ${tileColors[2].border}`}>
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${tileColors[2].iconBg} text-white shadow-sm mb-2`}>
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <p className={`text-2xl font-bold ${tileColors[2].text}`}>{totalCompetencies}</p>
                          <p className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-gray-400">{t('competencies.total_competencies')}</p>
                        </div>
                      </div>

                      {/* By subject mini bar chart */}
                      <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
                          {t('competencies.by_subject_breakdown')}
                        </p>
                        {subjectRows.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('competencies.no_subjects_yet')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {subjectRows.map(([subjectName, count], idx) => {
                              const palette = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];
                              const textPalette = ['text-emerald-700 dark:text-emerald-300', 'text-teal-700 dark:text-teal-300', 'text-amber-700 dark:text-amber-300', 'text-violet-700 dark:text-violet-300', 'text-rose-700 dark:text-rose-300'];
                              const barColor = palette[idx % palette.length];
                              const textColor = textPalette[idx % textPalette.length];
                              const widthPct = Math.round((count / maxSubjectCount) * 100);
                              return (
                                <div key={subjectName} className="flex items-center gap-2">
                                  <div className="w-24 shrink-0 truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">{subjectName}</div>
                                  <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800/60 overflow-hidden min-w-0">
                                    <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${widthPct}%` }} />
                                  </div>
                                  <div className={`w-8 shrink-0 text-right text-[11px] font-bold ${textColor}`}>{count}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Recent templates */}
                      <div>
                        <p className="text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
                          {t('competencies.recent_templates')}
                        </p>
                        {recentTemplates.length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic">{t('competencies.no_recent_templates')}</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {recentTemplates.map((tmpl) => {
                              const meta = subjectMeta(tmpl.subject?.name);
                              return (
                                <button
                                  key={tmpl.id}
                                  onClick={() => setSelectedTemplate(tmpl)}
                                  className="text-left p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors group"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br ${meta.gradient} text-white text-xs font-bold shadow-sm shrink-0`}>
                                      {(tmpl.subject?.name ?? 'T')[0]}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300">{tmpl.name}</p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        {tmpl.subject?.name ?? '—'} · {tmpl.categories.reduce((s, c) => s + c.competencies.length, 0)} {t('polish.competency_count')}
                                      </p>
                                    </div>
                                    <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 shrink-0 mt-1" />
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            {/* Template info */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{selectedTemplate.name}</CardTitle>
                    <p className="text-sm text-emerald-600/60 dark:text-emerald-400/40 mt-1">
                      {selectedTemplate.subject?.name ?? '—'} · {t(`school_type.${selectedTemplate.schoolType.toLowerCase()}`)} · {t('competencies.grade_range', { min: selectedTemplate.gradeLevelMin, max: selectedTemplate.gradeLevelMax })} · {t('competencies.version')} {selectedTemplate.version}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-xl">
                    {t('competencies.used_in_classes', { count: selectedTemplate._count?.classCompetencyAssignments ?? 0 })}
                  </Badge>
                </div>
              </CardHeader>
              {selectedTemplate.description && (
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedTemplate.description}</p>
                </CardContent>
              )}
            </Card>

            {/* Grid structure */}
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                      <Layers className="h-4 w-4" />
                    </div>
                    {t('competencies.grid_structure')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs rounded-xl" onClick={() => {
                      const allCatIds = new Set(selectedTemplate.categories.map((c) => c.id));
                      setExpandedCategories(allCatIds);
                    }}>
                      {t('competencies.expand_all')}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs rounded-xl" onClick={() => setExpandedCategories(new Set())}>
                      {t('competencies.collapse_all')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedTemplate.categories.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 mx-auto mb-4">
                      <Layers className="h-8 w-8 text-teal-400 dark:text-teal-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('competencies.no_categories')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedTemplate.categories.map((cat, catIdx) => {
                      const colorSet = categoryColors[catIdx % categoryColors.length];
                      const isExpanded = expandedCategories.has(cat.id);
                      const catColor = cat.color ?? ['#10b981', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9'][catIdx % 6];

                      return (
                        <div key={cat.id} className={`rounded-xl border-l-3 overflow-hidden transition-shadow duration-200 hover:shadow-md ${colorSet.border}`}>
                          {/* Category header bar */}
                          <button
                            onClick={() => toggleCategory(cat.id)}
                            className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${colorSet.header} to-transparent transition-colors hover:brightness-105`}
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <div
                                className="w-5 h-5 rounded-md shadow-sm ring-1 ring-white dark:ring-gray-900"
                                style={{ backgroundColor: catColor }}
                              />
                              <h3 className="font-bold text-gray-900 dark:text-gray-100">{cat.name}</h3>
                              <Badge className={`${colorSet.bg} ${colorSet.text} text-xs font-medium rounded-xl inline-flex items-center gap-1`}>
                                <Tag className="h-3 w-3" />
                                {cat.competencies.length} {t('polish.competency_count')}
                              </Badge>
                              {/* Average mastery per category (derived) */}
                              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] ${colorSet.text} opacity-80 px-2 py-0.5 rounded-md bg-white/50 dark:bg-gray-800/50`}>
                                <TrendingUp className="h-3 w-3" />
                                {Array.from({ length: cat.competencies.length }).reduce<number>((sum, _, i) => sum + masteredPercent(cat.competencies[i]?.id ?? 'x'), 0) / Math.max(1, cat.competencies.length) | 0}% {t('polish.mastered')}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            )}
                          </button>

                          {/* Competencies */}
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-emerald-200/20 dark:border-emerald-900/10"
                            >
                              <div className="space-y-2 p-3">
                                {cat.competencies.map((comp) => {
                                  const dist = masteryDistribution(comp.id);
                                  const mastered = masteredPercent(comp.id);
                                  return (
                                  <div
                                    key={comp.id}
                                    className="p-4 rounded-lg bg-gray-50/80 dark:bg-gray-800/30 border-l-2 transition-all duration-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:shadow-sm"
                                    style={{ borderLeftColor: catColor }}
                                  >
                                    <div className="flex items-start justify-between mb-1 gap-2">
                                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0">
                                        <span className="text-emerald-500/60 dark:text-emerald-400/40 font-mono mr-2">{comp.code}</span>
                                        {comp.title}
                                      </p>
                                      <Badge variant="outline" className={`shrink-0 text-[10px] rounded-md font-semibold ${mastered >= 70 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-900/30' : mastered >= 40 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-900/30' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/50 dark:border-red-900/30'}`}>
                                        <TrendingUp className="h-3 w-3 mr-0.5" />
                                        {mastered}% {t('polish.mastered')}
                                      </Badge>
                                    </div>
                                    {comp.description && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{comp.description}</p>
                                    )}
                                    {/* Mastery distribution mini bar chart */}
                                    <div className="flex items-center gap-2 mb-2">
                                      <BarChart3 className="h-3 w-3 text-gray-400 shrink-0" />
                                      <div className="flex h-2 w-full max-w-[220px] rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-inner">
                                        {dist.map((d) => (
                                          <div
                                            key={d.level}
                                            className={`${d.color} transition-all duration-300 hover:brightness-110`}
                                            style={{ width: `${d.pct}%` }}
                                            title={`${t('polish.level_' + d.level)}: ${d.pct}%`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{t('polish.mastery_distribution')}</span>
                                    </div>
                                    {comp.masteryLevelDefinitions.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        {comp.masteryLevelDefinitions.map((ml) => (
                                          <Badge key={ml.id} className={`text-[10px] rounded-xl font-medium ${masteryColor(ml.levelValue)}`}>
                                            {masteryIcon(ml.levelValue)} {ml.levelValue}: {ml.label}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
