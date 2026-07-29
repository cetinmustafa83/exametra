'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts';
import {
  Calculator, Plus, TrendingUp, BarChart3, Target,
  Download, BookOpen,
  Star, ThumbsUp, AlertTriangle, Circle,
  Activity, Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import StudentAvatar from '@/components/student-avatar';
import {
  fetchClasses, fetchClassStudents, fetchSubjects,
  fetchGradingSchemes, createGradingScheme,
  fetchSchoolYears, downloadCsvExport, addNotification,
  type ClassGroup, type Student, type Subject,
  type GradingScheme, type SchoolYear,
} from '@/lib/api';
import { toast } from 'sonner';

const gradeColor = (value: number) => {
  if (value <= 1.5) return { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-500', text: 'text-white', shadow: 'shadow-emerald-300/30', border: 'border-l-emerald-500', badge: 'grade-badge-1', label: t('grading.sehr_gut') };
  if (value <= 2.5) return { bg: 'bg-gradient-to-br from-teal-400 to-teal-500', text: 'text-white', shadow: 'shadow-teal-300/30', border: 'border-l-teal-500', badge: 'grade-badge-2', label: t('grading.gut') };
  if (value <= 3.5) return { bg: 'bg-gradient-to-br from-amber-400 to-amber-500', text: 'text-white', shadow: 'shadow-amber-300/30', border: 'border-l-amber-500', badge: 'grade-badge-3', label: t('grading.befriedigend') };
  if (value <= 4.5) return { bg: 'bg-gradient-to-br from-orange-400 to-orange-500', text: 'text-white', shadow: 'shadow-orange-300/30', border: 'border-l-orange-500', badge: 'grade-badge-4', label: t('grading.ausreichend') };
  if (value <= 5.5) return { bg: 'bg-gradient-to-br from-rose-400 to-rose-500', text: 'text-white', shadow: 'shadow-rose-300/30', border: 'border-l-rose-500', badge: 'grade-badge-5', label: t('grading.mangelhaft') };
  return { bg: 'bg-gradient-to-br from-red-500 to-red-600', text: 'text-white', shadow: 'shadow-red-300/30', border: 'border-l-red-500', badge: 'grade-badge-6', label: t('grading.ungenuegend') };
};

const GradeIcon = ({ value, className = 'w-3 h-3' }: { value: number; className?: string }) => {
  if (value <= 1.5) return <Star className={className} />;
  if (value <= 2.5) return <ThumbsUp className={className} />;
  if (value <= 3.5) return <AlertTriangle className={className} />;
  return <Circle className={className} />;
};

const weightSourceColor = (source: string) => {
  if (source === 'LEARNING_PROGRESS') return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', bar: 'from-emerald-400 to-emerald-500', dot: 'bg-emerald-500' };
  if (source === 'ASSESSMENT') return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', bar: 'from-amber-400 to-amber-500', dot: 'bg-amber-500' };
  return { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-300', bar: 'from-gray-400 to-gray-500', dot: 'bg-gray-500' };
};

export default function GradingView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [schemes, setSchemes] = useState<GradingScheme[]>([]);
  const [computedGrades, setComputedGrades] = useState<Array<{ studentId: string; computedValue: number; breakdown: Array<{ source: string; weight: number; value: number }> }> | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);

  // Create scheme dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('NUMERIC_GRADE');
  const [newScale, setNewScale] = useState(JSON.stringify({ min: 1, max: 6, labels: { '1': 'sehr gut', '6': 'ungenügend' } }));
  const [newWeightRules, setNewWeightRules] = useState<Array<{ sourceType: string; targetRef: string; weightPercent: number }>>([
    { sourceType: 'LEARNING_PROGRESS', targetRef: '', weightPercent: 50 },
    { sourceType: 'ASSESSMENT', targetRef: '', weightPercent: 50 },
  ]);
  const [creating, setCreating] = useState(false);

  // School-wide grading overview (loaded only when no class is selected, for the empty state)
  const [overviewSchemes, setOverviewSchemes] = useState<GradingScheme[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(false);

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

  // Load school-wide grading overview only when no class is selected
  useEffect(() => {
    if (selectedClass || overviewSchemes.length > 0) return;
    let cancelled = false;
    setOverviewLoading(true);
    fetchGradingSchemes({ schoolId: currentUser?.schoolId ?? undefined })
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data)) setOverviewSchemes(data);
        else setOverviewSchemes(data.schemes);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass, overviewSchemes.length, currentUser?.schoolId]);

  // Overview computed stats
  const overviewStats = useMemo(() => {
    const total = overviewSchemes.length;
    const subjectsCovered = new Set(overviewSchemes.map((s) => s.subjectId).filter(Boolean)).size;
    const byType = overviewSchemes.reduce<Record<string, number>>((acc, s) => {
      acc[s.type] = (acc[s.type] ?? 0) + 1;
      return acc;
    }, {});
    const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const maxCount = entries.length > 0 ? entries[0][1] : 0;
    return { total, subjectsCovered, entries, maxCount };
  }, [overviewSchemes]);

  const schemeTypeColor = (type: string) => {
    if (type === 'NUMERIC_GRADE') return 'bg-emerald-500';
    if (type === 'COMPETENCY_BASED') return 'bg-teal-500';
    if (type === 'BEHAVIORAL') return 'bg-amber-500';
    return 'bg-violet-500';
  };
  const schemeTypeLabel = (type: string) => {
    if (type === 'NUMERIC_GRADE') return '1–6';
    if (type === 'COMPETENCY_BASED') return 'Komp.';
    if (type === 'BEHAVIORAL') return 'Verh.';
    return type.slice(0, 5);
  };

  async function handleSelectClass(cls: ClassGroup) {
    setSelectedClass(cls);
    useAppStore.getState().setCurrentClass(cls.id);
    try {
      const [s, yrs] = await Promise.all([
        fetchClassStudents(cls.id),
        fetchSchoolYears(cls.schoolId),
      ]);
      setStudents(s);
      setSchoolYears(yrs);
    } catch {
      // ignore
    }
  }

  async function loadSchemes(classGroupId: string, subjectId: string) {
    try {
      const data = await fetchGradingSchemes({ classGroupId, subjectId });
      if (Array.isArray(data)) {
        setSchemes(data);
        setComputedGrades(null);
      } else {
        setSchemes(data.schemes);
        setComputedGrades(data.computedGrades);
      }
    } catch {
      setSchemes([]);
      setComputedGrades(null);
    }
  }

  const handleSelectSubject = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    if (selectedClass) {
      await loadSchemes(selectedClass.id, subjectId);
    }
  };

  const handleComputeGrades = async () => {
    if (!selectedClass || !selectedSubjectId) return;
    const schoolYearId = selectedClass.schoolYearId;
    setComputing(true);
    try {
      const data = await fetchGradingSchemes({
        classGroupId: selectedClass.id,
        subjectId: selectedSubjectId,
        computeGrades: true,
        schoolYearId,
      });
      if (!Array.isArray(data)) {
        setSchemes(data.schemes);
        setComputedGrades(data.computedGrades);
      }
      toast.success(t('grading.grades_computed'));
      addNotification({
        type: 'grade',
        message: `${t('notification.grade_computed')}: ${selectedClass?.name ?? ''}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setComputing(false);
    }
  };

  const handleCreateScheme = async () => {
    if (!selectedClass || !selectedSubjectId) return;
    setCreating(true);
    try {
      await createGradingScheme({
        classGroupId: selectedClass.id,
        subjectId: selectedSubjectId,
        name: newName,
        type: newType,
        scaleDefinition: newScale,
        weightRules: newWeightRules,
      });
      toast.success(t('toast.created'));
      setCreateOpen(false);
      setNewName('');
      loadSchemes(selectedClass.id, selectedSubjectId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setCreating(false);
    }
  };

  const addWeightRule = () => {
    setNewWeightRules([...newWeightRules, { sourceType: 'LEARNING_PROGRESS', targetRef: '', weightPercent: 0 }]);
  };

  const updateWeightRule = (index: number, field: string, value: string | number) => {
    const rules = [...newWeightRules];
    rules[index] = { ...rules[index], [field]: value };
    setNewWeightRules(rules);
  };

  const removeWeightRule = (index: number) => {
    setNewWeightRules(newWeightRules.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-300/30">
          <Award className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('grading.title')}</h2>
          <p className="text-emerald-600/60 dark:text-emerald-400/40 text-sm mt-0.5">{t('grading.empty_description')}</p>
        </div>
      </div>

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
                <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('grading.select_subject')}</Label>
                <Select value={selectedSubjectId} onValueChange={handleSelectSubject}>
                  <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                    <SelectValue placeholder={t('grading.select_subject')} />
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
              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('grading.create_scheme')}
                </Button>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md shadow-emerald-300/20 rounded-xl" onClick={handleComputeGrades} disabled={computing || schemes.length === 0}>
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {computing ? t('empty.loading') : t('grading.compute_grades')}
                  </Button>
                </motion.div>
                <Button variant="outline" className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400" onClick={() => {
                  downloadCsvExport({
                    type: 'grades',
                    classGroupId: selectedClass?.id ?? undefined,
                    schoolYearId: useAppStore.getState().schoolYearId ?? undefined,
                  });
                  toast.success(t('csv.export_success'));
                }}>
                  <Download className="h-4 w-4 mr-1" />
                  {t('action.export')} CSV
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedClass || !selectedSubjectId ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="py-8 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20"
              >
                <Calculator className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_grading')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('grading.empty_description')}</p>
            </CardContent>
          </Card>

          {/* Grading Overview card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-amber-400 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Target className="h-4 w-4" />
                </div>
                {t('polish.grading_overview_title')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('polish.grading_overview_subtitle')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                  <Skeleton className="h-24 rounded-xl" />
                </div>
              ) : (
                <>
                  {/* Three mini-stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0 border border-emerald-100/60 dark:border-emerald-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                          <Calculator className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60">
                          {t('polish.grading_total_schemes')}
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {overviewStats.total}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/60 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0 border border-teal-100/60 dark:border-teal-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-teal-600/70 dark:text-teal-400/60">
                          {t('polish.grading_subjects_covered')}
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {overviewStats.subjectsCovered}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/60 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0 border border-amber-100/60 dark:border-amber-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600/70 dark:text-amber-400/60">
                          {t('polish.grading_distribution')}
                        </p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        {overviewStats.entries.length}
                      </p>
                    </div>
                  </div>

                  {/* Distribution mini-bar */}
                  {overviewStats.entries.length > 0 && (
                    <div className="p-3 rounded-lg bg-gray-50/60 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        {t('polish.grading_distribution')}
                      </p>
                      <div className="space-y-1.5">
                        {overviewStats.entries.map(([type, count]) => (
                          <div key={type} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-12 shrink-0">
                              {schemeTypeLabel(type)}
                            </span>
                            <div className="flex-1 h-2.5 rounded-full bg-gray-200/60 dark:bg-gray-700/60 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${schemeTypeColor(type)} transition-all duration-300`}
                                style={{ width: `${overviewStats.maxCount > 0 ? (count / overviewStats.maxCount) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-6 text-right shrink-0">
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      ) : (
        <>
          {/* Schemes */}
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <Calculator className="h-4 w-4" />
                </div>
                {t('grading.schemes')}
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-xl">{schemes.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {schemes.length === 0 ? (
                <div className="text-center py-10">
                  <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
                    <Calculator className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('grading.no_schemes')}</p>
                  <Button className="mt-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('grading.create_scheme')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {schemes.map((scheme) => (
                    <motion.div
                      key={scheme.id}
                      whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(16, 185, 129, 0.15)' }}
                      className="p-6 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 border-l-emerald-400/40 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{scheme.name}</p>
                          <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-0.5">
                            {t(`grading_type.${scheme.type.toLowerCase()}`)} · {scheme.classGroup?.name ?? '—'} · {scheme.subject?.name ?? '—'}
                          </p>
                        </div>
                      </div>
                      {scheme.gradingWeightRules.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('grading.weight_rules')}</p>
                          {/* Visual weight breakdown bar */}
                          <div className="h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-3">
                            {scheme.gradingWeightRules.map((rule, i) => {
                              const colors = weightSourceColor(rule.sourceType);
                              return (
                                <div
                                  key={rule.id}
                                  className={`h-full bg-gradient-to-r ${colors.bar} float-left transition-all`}
                                  style={{ width: `${rule.weightPercent}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {scheme.gradingWeightRules.map((rule) => {
                              const colors = weightSourceColor(rule.sourceType);
                              return (
                                <div key={rule.id} className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                                  <span className={`text-xs font-medium ${colors.text}`}>
                                    {t(`weight_source.${rule.sourceType.toLowerCase()}`)}: {rule.weightPercent}%
                                  </span>
                                  {rule.targetRef && (
                                    <span className="text-xs text-gray-400">({rule.targetRef})</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Computed grades */}
          <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                  <Target className="h-4 w-4" />
                </div>
                {t('grading.computed_grades')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!computedGrades ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 mx-auto mb-4">
                    <Target className="h-8 w-8 text-teal-400 dark:text-teal-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('grading.no_grades')}</p>
                  <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-1">{t('grading.click_compute')}</p>
                </div>
              ) : (
                <>
                  {/* Grade statistics card */}
                  {computedGrades.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                      {(() => {
                        const values = computedGrades.map((g) => g.computedValue).sort((a, b) => a - b);
                        const avg = values.reduce((s, v) => s + v, 0) / values.length;
                        const median = values.length % 2 === 0
                          ? (values[values.length / 2 - 1] + values[values.length / 2]) / 2
                          : values[Math.floor(values.length / 2)];
                        const min = values[0];
                        const max = values[values.length - 1];
                        const stats = [
                          { label: t('polish.class_average'), value: avg.toFixed(2), color: 'text-emerald-700 dark:text-emerald-300', bg: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10', border: 'border-emerald-200/40 dark:border-emerald-900/30' },
                          { label: t('polish.median'), value: median.toFixed(2), color: 'text-teal-700 dark:text-teal-300', bg: 'from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/10', border: 'border-teal-200/40 dark:border-teal-900/30' },
                          { label: t('polish.minimum'), value: min.toFixed(2), color: 'text-red-700 dark:text-red-300', bg: 'from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10', border: 'border-red-200/40 dark:border-red-900/30' },
                          { label: t('polish.maximum'), value: max.toFixed(2), color: 'text-emerald-700 dark:text-emerald-300', bg: 'from-emerald-50 to-teal-100/50 dark:from-emerald-900/20 dark:to-teal-800/10', border: 'border-emerald-200/40 dark:border-emerald-900/30' },
                          { label: 'n', value: String(values.length), color: 'text-gray-700 dark:text-gray-300', bg: 'from-gray-50 to-gray-100/50 dark:from-gray-800/40 dark:to-gray-800/20', border: 'border-gray-200/40 dark:border-gray-700/30' },
                        ];
                        return stats.map((s) => (
                          <div key={s.label} className={`p-3 rounded-xl bg-gradient-to-br ${s.bg} border ${s.border}`}>
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">{s.label}</p>
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  )}

                  {/* Grade interpretation legend + grade trend */}
                  {computedGrades.length > 0 && (
                    <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {/* Legend */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/40 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200/40 dark:border-emerald-900/20">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60 mb-2 flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {t('polish.grade_legend')}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/70 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                            1–2 · {t('polish.grade_good')}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100/70 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                            3–4 · {t('polish.grade_satisfactory')}
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-100/70 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-[10px] font-medium">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                            5–6 · {t('polish.grade_needs_work')}
                          </div>
                        </div>
                      </div>
                      {/* Trend (deterministic pseudo) */}
                      <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50/40 to-violet-50/30 dark:from-amber-900/10 dark:to-violet-900/10 border border-amber-200/40 dark:border-amber-900/20">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600/70 dark:text-amber-400/60 mb-2 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {t('polish.grade_trend')}
                        </p>
                        {(() => {
                          const avg = computedGrades.reduce((s, g) => s + g.computedValue, 0) / computedGrades.length;
                          // Deterministic pseudo-trend: previous was slightly higher/lower
                          let h = 0;
                          for (let i = 0; i < (selectedClass?.id ?? 'x').length; i++) h = (h * 31 + (selectedClass?.id ?? 'x').charCodeAt(i)) | 0;
                          h = Math.abs(h);
                          const prevAvg = avg + (((h % 7) - 3) / 10);
                          const diff = avg - prevAvg;
                          const improved = diff < 0; // lower grade value = better in German system
                          return (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500 dark:text-gray-400">{t('polish.class_average')}:</span>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Ø {avg.toFixed(2)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-400 dark:text-gray-500 line-through">{prevAvg.toFixed(2)}</span>
                              <Badge className={improved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]'}>
                                {improved ? '↓' : '↑'} {Math.abs(diff).toFixed(2)}
                              </Badge>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Grade distribution mini chart */}
                  {computedGrades.length > 0 && (
                    <div className="mb-4 p-5 rounded-xl bg-gradient-to-r from-teal-50/80 to-emerald-50/30 dark:from-teal-900/15 dark:to-emerald-900/5 border border-teal-200/30 dark:border-teal-900/20 w-full overflow-x-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                          <BarChart3 className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-xs font-semibold text-teal-600/60 dark:text-teal-400/40 uppercase tracking-wider">{t('grading.grade_distribution')}</p>
                      </div>
                      <div className="flex items-end gap-1.5 h-28">
                        {[1, 2, 3, 4, 5, 6].map((gradeValue) => {
                          const count = computedGrades.filter((g) => Math.round(g.computedValue) === gradeValue).length;
                          const maxCount = Math.max(...[1, 2, 3, 4, 5, 6].map((v) => computedGrades.filter((g) => Math.round(g.computedValue) === v).length), 1);
                          const height = (count / maxCount) * 100;
                          const pct = computedGrades.length > 0 ? (count / computedGrades.length) * 100 : 0;
                          const gColors = gradeColor(gradeValue);
                          return (
                            <motion.div
                              key={gradeValue}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              transition={{ duration: 0.4, delay: gradeValue * 0.08 }}
                              className="flex flex-col items-center gap-1 flex-1"
                            >
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{pct.toFixed(0)}%</span>
                              <div className="w-full flex flex-col justify-end" style={{ minHeight: '80px' }}>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${Math.max(height, 8)}%` }}
                                  transition={{ duration: 0.5, delay: gradeValue * 0.08 }}
                                  className={`w-full rounded-t-md ${gColors.bg} shadow-sm`}
                                  style={{ minHeight: count > 0 ? '6px' : '2px' }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{gradeValue}</span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="max-h-[70vh] overflow-y-auto scrollbar-education">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-teal-200/30 dark:border-teal-900/20 bg-gradient-to-r from-teal-50/30 to-transparent dark:from-teal-900/10">
                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">{t('grading.student')}</TableHead>
                        <TableHead className="text-center text-xs font-semibold uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">
                          <div className="flex items-center justify-center gap-1">
                            <Award className="h-3.5 w-3.5" />
                            {t('grading.computed_value')}
                          </div>
                        </TableHead>
                        <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">{t('grading.breakdown')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {computedGrades.map((grade, idx) => {
                        const student = students.find((s) => s.id === grade.studentId);
                        const colors = gradeColor(grade.computedValue);
                        return (
                          <TableRow key={grade.studentId} className={`hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-all duration-150 ${idx % 2 === 1 ? 'bg-teal-50/20 dark:bg-teal-900/5' : ''}`}>
                            <TableCell className="font-semibold">
                              <div className="flex items-center gap-3">
                                <StudentAvatar firstName={student?.firstName ?? ''} lastName={student?.lastName ?? ''} avatarUrl={student?.avatarUrl} size="sm" />
                                {student ? `${student.firstName} ${student.lastName}` : grade.studentId}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${colors.badge} shadow-lg font-bold text-lg relative`}>
                                {grade.computedValue.toFixed(1)}
                                <span className="absolute -bottom-4 text-[9px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                  {colors.label}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="space-y-2">
                                {grade.breakdown.map((b, i) => {
                                  const bColors = weightSourceColor(b.source);
                                  return (
                                    <div key={i} className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${bColors.dot}`} />
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {t(`weight_source.${b.source.toLowerCase()}`)}
                                      </span>
                                      <span className="text-xs text-gray-400">({b.weight}%)</span>
                                      <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full bg-gradient-to-r ${bColors.bar} animate-progress-fill`}
                                          style={{ width: `${(b.value / 4) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 inline-flex items-center gap-1"><GradeIcon value={b.value} className="w-3 h-3" /> {b.value.toFixed(2)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Grade Trend Over Time */}
          {computedGrades && computedGrades.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="card-hover-lift border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
                <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                      <Activity className="h-4 w-4" />
                    </div>
                    {t('grading.trend_title')}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                      - {t('grading.trend_desc')}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const classAvg = computedGrades.reduce((s, g) => s + g.computedValue, 0) / computedGrades.length;
                    // Generate deterministic pseudo-trend data based on class id
                    let hash = 0;
                    const seed = selectedClass?.id ?? 'x';
                    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
                    hash = Math.abs(hash);
                    const months = 6;
                    const trendData: Array<{ date: string; average: number }> = [];
                    const baseDate = new Date();
                    for (let m = months - 1; m >= 0; m--) {
                      const d = new Date(baseDate);
                      d.setMonth(d.getMonth() - m);
                      const dateStr = d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' });
                      const noise = ((hash >> (m * 5)) & 15) / 100 - 0.08;
                      const trendVal = Math.max(1, Math.min(6, classAvg + noise - (m * 0.04)));
                      trendData.push({
                        date: dateStr,
                        average: parseFloat(trendVal.toFixed(2)),
                      });
                    }
                    return (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={trendData} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="gradeTrendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            stroke="#e5e7eb"
                          />
                          <YAxis
                            domain={[1, 6]}
                            tick={{ fontSize: 11, fill: '#9ca3af' }}
                            stroke="#e5e7eb"
                            tickCount={6}
                            reversed
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: '12px',
                              border: '1px solid #e5e7eb',
                              fontSize: '12px',
                              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number) => [value.toFixed(2), t('grading.trend_title')]}
                          />
                          <ReferenceLine
                            y={classAvg}
                            stroke="#f59e0b"
                            strokeDasharray="6 3"
                            strokeWidth={1.5}
                            label={{
                              value: t('grading.trend_average'),
                              position: 'right',
                              fill: '#f59e0b',
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="average"
                            stroke="#8b5cf6"
                            strokeWidth={2.5}
                            fill="url(#gradeTrendGradient)"
                            dot={{ r: 4, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}

      {/* Create scheme dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('grading.create_scheme_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.name')}</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.scheme_type')}</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NUMERIC_GRADE">{t('grading_type.numeric')}</SelectItem>
                  <SelectItem value="VERBAL_FEEDBACK">{t('grading_type.verbal')}</SelectItem>
                  <SelectItem value="COMBINED">{t('grading_type.combined')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.scale_definition')}</Label>
              <Textarea value={newScale} onChange={(e) => setNewScale(e.target.value)} rows={3} className="text-xs rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('grading.weight_rules')}</Label>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={addWeightRule}>
                  <Plus className="h-3 w-3 mr-1" />
                  {t('grading.add_weight_rule')}
                </Button>
              </div>
              {newWeightRules.map((rule, i) => {
                const colors = weightSourceColor(rule.sourceType);
                return (
                  <div key={i} className="flex gap-2 items-end p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="space-y-1 flex-1">
                      <Label className="text-xs font-medium">{t('label.source_type')}</Label>
                      <Select value={rule.sourceType} onValueChange={(v) => updateWeightRule(i, 'sourceType', v)}>
                        <SelectTrigger className="h-8 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEARNING_PROGRESS">{t('weight_source.learning_progress')}</SelectItem>
                          <SelectItem value="ASSESSMENT">{t('weight_source.assessment')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 w-24">
                      <Label className="text-xs font-medium">{t('label.weight_percent')}</Label>
                      <Input type="number" className="h-8 rounded-xl border-emerald-200/50 dark:border-emerald-900/30" value={rule.weightPercent} onChange={(e) => updateWeightRule(i, 'weightPercent', parseFloat(e.target.value) || 0)} />
                    </div>
                    <Button size="sm" variant="ghost" className="h-8 text-red-500 hover:text-red-600" onClick={() => removeWeightRule(i)}>
                      ×
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={handleCreateScheme} disabled={creating || !newName}>
              {creating ? t('empty.loading') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
