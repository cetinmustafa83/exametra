'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Plus,
  Trash2,
  Save,
  X,
  Loader2,
  Clock,
  BookOpen,
  Target,
  Package,
  PencilLine,
  ListChecks,
  AlertCircle,
  ChevronRight,
  FileText,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  listLessonPlans,
  createLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
  fetchClasses,
  fetchSubjects,
  fetchCompetencyTemplates,
  type LessonPlan,
  type LessonPlanStatus,
  type ClassGroup,
  type Subject,
  type CompetencyTemplate,
  type CompetencyItem,
} from '@/lib/api';

/* ── Status helpers ────────────────────────────────────────────────── */

type StatusConfig = {
  iconComponent: React.ElementType;
  badgeClass: string;
  dotClass: string;
};

const STATUS_CONFIG: Record<LessonPlanStatus, StatusConfig> = {
  draft: {
    iconComponent: FileText,
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    dotClass: 'bg-gray-400',
  },
  scheduled: {
    iconComponent: Calendar,
    badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
  completed: {
    iconComponent: CheckCircle,
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    dotClass: 'bg-teal-500',
  },
  cancelled: {
    iconComponent: XCircle,
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
  },
};

const STATUSES: LessonPlanStatus[] = ['draft', 'scheduled', 'completed', 'cancelled'];

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const DAY_LABELS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDayLabel(date: Date, locale: string): string {
  const labels = locale === 'de' ? DAY_LABELS_DE : DAY_LABELS_EN;
  return labels[date.getDay()];
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function parseJSONList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    return [];
  } catch {
    return [];
  }
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // Treat Monday as start of week (day 1). Sunday (0) becomes 6 days back.
  const diff = (day === 0 ? -6 : 1 - day);
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isWithinThisWeek(d: Date, ref: Date): boolean {
  const start = startOfWeek(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return d >= start && d < end;
}

/* ── Edit dialog form state ────────────────────────────────────────── */

interface FormState {
  id?: string;
  title: string;
  description: string;
  classGroupId: string;
  subjectId: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  durationMin: number;
  status: LessonPlanStatus;
  objectives: string[];
  materials: string[];
  homework: string;
  reflection: string;
  linkedCompetencyIds: string[];
}

function emptyForm(classGroupId: string): FormState {
  const now = new Date();
  const date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    title: '',
    description: '',
    classGroupId,
    subjectId: '',
    date: date.toISOString().slice(0, 10),
    time: '08:30',
    durationMin: 45,
    status: 'draft',
    objectives: [],
    materials: [],
    homework: '',
    reflection: '',
    linkedCompetencyIds: [],
  };
}

function lessonPlanToForm(lp: LessonPlan): FormState {
  const d = new Date(lp.date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    id: lp.id,
    title: lp.title,
    description: lp.description ?? '',
    classGroupId: lp.classGroupId,
    subjectId: lp.subjectId ?? '',
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    durationMin: lp.durationMin,
    status: lp.status,
    objectives: parseJSONList(lp.objectives),
    materials: parseJSONList(lp.materials),
    homework: lp.homework ?? '',
    reflection: lp.reflection ?? '',
    linkedCompetencyIds: parseJSONList(lp.linkedCompetencyIds),
  };
}

function formToDate(form: FormState): Date {
  return new Date(`${form.date}T${form.time || '00:00'}:00`);
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function LessonPlansView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const schoolYearId = useAppStore((s) => s.schoolYearId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [competencyTemplates, setCompetencyTemplates] = useState<CompetencyTemplate[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);

  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newObjective, setNewObjective] = useState('');
  const [newMaterial, setNewMaterial] = useState('');

  /* ── Load classes & subjects ────────────────────────────────────── */
  useEffect(() => {
    setClassesLoading(true);
    Promise.all([
      fetchClasses(currentUser?.schoolId ?? undefined, schoolYearId ?? undefined).catch(() => []),
      fetchSubjects(currentUser?.schoolId ?? undefined).catch(() => []),
    ])
      .then(([c, s]) => {
        setClasses(c);
        setSubjects(s);
      })
      .finally(() => setClassesLoading(false));
  }, [currentUser?.schoolId, schoolYearId]);

  /* ── Load lesson plans ──────────────────────────────────────────── */
  const loadLessonPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listLessonPlans({
        classGroupId: filterClassId !== 'all' ? filterClassId : undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      });
      setLessonPlans(data);
    } catch (err) {
      console.error('Failed to load lesson plans', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filterClassId, filterStatus, filterDateFrom, filterDateTo]);

  useEffect(() => {
    if (!currentUser) return;
    loadLessonPlans();
  }, [currentUser, loadLessonPlans]);

  /* ── Load competency templates (for the selected class) ─────────── */
  useEffect(() => {
    if (!form?.classGroupId) {
      setCompetencyTemplates([]);
      return;
    }
    fetchCompetencyTemplates({ schoolId: currentUser?.schoolId ?? undefined })
      .then(setCompetencyTemplates)
      .catch(() => setCompetencyTemplates([]));
  }, [form?.classGroupId, currentUser?.schoolId]);

  /* ── Derived data ───────────────────────────────────────────────── */
  const now = useMemo(() => new Date(), []);

  const upcomingLessons = useMemo(() => {
    return lessonPlans
      .filter((lp) => lp.status !== 'cancelled' && new Date(lp.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [lessonPlans, now]);

  const thisWeekLessons = useMemo(() => {
    return lessonPlans
      .filter((lp) => isWithinThisWeek(new Date(lp.date), now))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [lessonPlans, now]);

  // Group this week's lessons by day
  const thisWeekByDay = useMemo(() => {
    const start = startOfWeek(now);
    const days: { dayKey: string; dayLabel: string; date: Date; lessons: LessonPlan[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      days.push({
        dayKey: DAY_KEYS[date.getDay()],
        dayLabel: getDayLabel(date, locale),
        date,
        lessons: thisWeekLessons.filter((lp) => isSameDay(new Date(lp.date), date)),
      });
    }
    return days;
  }, [thisWeekLessons, now, locale]);

  /* ── Form actions ───────────────────────────────────────────────── */
  const openCreate = () => {
    setForm(emptyForm(classes[0]?.id ?? ''));
    setNewObjective('');
    setNewMaterial('');
    setDialogOpen(true);
  };

  const openEdit = (lp: LessonPlan) => {
    setForm(lessonPlanToForm(lp));
    setNewObjective('');
    setNewMaterial('');
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    setForm(null);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error(t('lesson.field.title'));
      return;
    }
    if (!form.classGroupId) {
      toast.error(t('lesson.select_class_first'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        classGroupId: form.classGroupId,
        subjectId: form.subjectId || null,
        date: formToDate(form).toISOString(),
        durationMin: form.durationMin,
        status: form.status,
        objectives: form.objectives,
        materials: form.materials,
        homework: form.homework.trim() || undefined,
        reflection: form.reflection.trim() || undefined,
        linkedCompetencyIds: form.linkedCompetencyIds,
      };
      if (form.id) {
        await updateLessonPlan(form.id, payload);
      } else {
        await createLessonPlan(payload);
      }
      toast.success(t('lesson.saved'));
      setDialogOpen(false);
      setForm(null);
      await loadLessonPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteLessonPlan(deleteId);
      toast.success(t('lesson.deleted'));
      setDeleteId(null);
      await loadLessonPlans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const addObjective = () => {
    if (!form) return;
    const v = newObjective.trim();
    if (!v) return;
    setForm({ ...form, objectives: [...form.objectives, v] });
    setNewObjective('');
  };

  const removeObjective = (idx: number) => {
    if (!form) return;
    setForm({ ...form, objectives: form.objectives.filter((_, i) => i !== idx) });
  };

  const addMaterial = () => {
    if (!form) return;
    const v = newMaterial.trim();
    if (!v) return;
    setForm({ ...form, materials: [...form.materials, v] });
    setNewMaterial('');
  };

  const removeMaterial = (idx: number) => {
    if (!form) return;
    setForm({ ...form, materials: form.materials.filter((_, i) => i !== idx) });
  };

  const toggleCompetency = (id: string) => {
    if (!form) return;
    const exists = form.linkedCompetencyIds.includes(id);
    setForm({
      ...form,
      linkedCompetencyIds: exists
        ? form.linkedCompetencyIds.filter((c) => c !== id)
        : [...form.linkedCompetencyIds, id],
    });
  };

  const classMap = useMemo(() => {
    const map = new Map<string, ClassGroup>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const subjectMap = useMemo(() => {
    const map = new Map<string, Subject>();
    subjects.forEach((s) => map.set(s.id, s));
    return map;
  }, [subjects]);

  const allCompetencies: { competency: CompetencyItem; templateName: string; categoryColor: string }[] = useMemo(() => {
    const list: { competency: CompetencyItem; templateName: string; categoryColor: string }[] = [];
    competencyTemplates.forEach((tpl) => {
      tpl.categories.forEach((cat) => {
        cat.competencies.forEach((comp) => {
          list.push({ competency: comp, templateName: tpl.name, categoryColor: cat.color ?? '#10b981' });
        });
      });
    });
    return list;
  }, [competencyTemplates]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight md:text-3xl">
            <CalendarDays className="h-7 w-7 text-emerald-600" />
            {t('lesson.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('lesson.subtitle')}</p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          disabled={classes.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('lesson.new')}
        </Button>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <Card className="border-emerald-100 dark:border-emerald-900/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('lesson.field.class')}</Label>
              <Select value={filterClassId} onValueChange={setFilterClassId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('lesson.filter_all')}</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('lesson.field.status')}</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('lesson.filter_all')}</SelectItem>
                  {STATUSES.map((s) => {
                    const StatusIcon = STATUS_CONFIG[s].iconComponent;
                    return (
                    <SelectItem key={s} value={s}>
                      <StatusIcon className="w-3.5 h-3.5 inline mr-1" /> {t(`lesson.status_${s}`)}
                    </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('lesson.field.date')} (von)</Label>
              <Input
                type="date"
                lang={locale === 'de' ? 'de-DE' : 'en-US'}
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              />
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">{t('lesson_plans.date_hint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t('lesson.field.date')} (bis)</Label>
              <Input
                type="date"
                lang={locale === 'de' ? 'de-DE' : 'en-US'}
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              />
              <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">{t('lesson_plans.date_hint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Loading state ───────────────────────────────────────────── */}
      {(loading || classesLoading) && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && !classesLoading && lessonPlans.length === 0 && (
        <Card className="border-dashed border-2 border-emerald-200 dark:border-emerald-900/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-emerald-50 p-5 dark:bg-emerald-950/40">
              <CalendarDays className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">{t('lesson.empty')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">{t('lesson.empty_desc')}</p>
            <Button
              onClick={openCreate}
              className="mt-5 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={classes.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              {t('lesson.new')}
            </Button>
            {classes.length === 0 && (
              <p className="text-xs text-amber-600 mt-3">{t('lesson.select_class_first')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Main layout: 2-col grid (list + agenda) ─────────────────── */}
      {!loading && !classesLoading && lessonPlans.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: Upcoming lessons list */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                {t('lesson.upcoming')}
              </h2>
              <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                {upcomingLessons.length}
              </Badge>
            </div>

            {upcomingLessons.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  {t('lesson.no_upcoming')}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {upcomingLessons.map((lp) => (
                    <LessonCard
                      key={lp.id}
                      lesson={lp}
                      className={lp.classGroup?.name}
                      subjectName={lp.subject?.name}
                      onEdit={() => openEdit(lp)}
                      onDelete={() => setDeleteId(lp.id)}
                      locale={locale}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Past / other lessons (cancelled or completed) */}
            {lessonPlans.some((lp) => lp.status === 'cancelled' || new Date(lp.date) < now) && (
              <div className="space-y-3 pt-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {locale === 'de' ? 'Weitere Stunden' : 'Other lessons'}
                </h2>
                <div className="space-y-3">
                  {lessonPlans
                    .filter((lp) => lp.status === 'cancelled' || new Date(lp.date) < now)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((lp) => (
                      <LessonCard
                        key={lp.id}
                        lesson={lp}
                        className={lp.classGroup?.name}
                        subjectName={lp.subject?.name}
                        onEdit={() => openEdit(lp)}
                        onDelete={() => setDeleteId(lp.id)}
                        locale={locale}
                        compact
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: This Week agenda */}
          <div className="lg:col-span-1">
            <Card className="border-emerald-100 dark:border-emerald-900/40 lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-emerald-600" />
                  {t('lesson.this_week')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[28rem] pr-3">
                  <div className="space-y-3">
                    {thisWeekByDay.map((day) => (
                      <div key={day.dayKey} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                            {day.dayLabel}
                          </span>
                          <span className="text-muted-foreground">
                            {day.date.getDate()}.
                            {day.date.getMonth() + 1}.
                          </span>
                        </div>
                        {day.lessons.length === 0 ? (
                          <div className="text-xs text-muted-foreground/60 italic pl-2 py-0.5">
                            —
                          </div>
                        ) : (
                          day.lessons.map((lp) => (
                            <button
                              key={lp.id}
                              onClick={() => openEdit(lp)}
                              className="w-full text-left rounded-md border border-l-4 bg-card hover:bg-accent transition-colors p-2 group"
                              style={{ borderLeftColor: STATUS_CONFIG[lp.status].dotClass.replace('bg-', '') }}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${STATUS_CONFIG[lp.status].dotClass}`} />
                                <span className="text-xs font-medium">{formatTime(new Date(lp.date), locale)}</span>
                                <span className="text-xs text-muted-foreground line-clamp-2 break-words flex-1 min-w-0">{lp.title}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                                {lp.classGroup && <Badge variant="outline" className="px-1 py-0 h-4 text-[10px]">{lp.classGroup.name}</Badge>}
                                {lp.subject && <span>· {lp.subject.name}</span>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Edit / Create dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen && form !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-emerald-600" />
              {form?.id ? t('lesson.edit') : t('lesson.new')}
            </DialogTitle>
            <DialogDescription>
              {form?.id ? t('lesson.edit') : t('lesson.new')}
            </DialogDescription>
          </DialogHeader>

          {form && (
            <ScrollArea className="max-h-[60vh] px-6">
              <div className="space-y-5 pb-4">
                {/* Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="lp-title">{t('lesson.field.title')} *</Label>
                  <Input
                    id="lp-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t('lesson.field.title')}
                  />
                </div>

                {/* Class + Subject + Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('lesson.field.class')} *</Label>
                    <Select
                      value={form.classGroupId}
                      onValueChange={(v) => setForm({ ...form, classGroupId: v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('lesson.field.class')} />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('lesson.field.subject')}</Label>
                    <Select
                      value={form.subjectId || '__none__'}
                      onValueChange={(v) => setForm({ ...form, subjectId: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('lesson.field.subject')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('lesson.field.status')}</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as LessonPlanStatus })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => {
                          const StatusIcon = STATUS_CONFIG[s].iconComponent;
                          return (
                          <SelectItem key={s} value={s}>
                            <StatusIcon className="w-3.5 h-3.5 inline mr-1" /> {t(`lesson.status_${s}`)}
                          </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date + Time + Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>{t('lesson.field.date')}</Label>
                    <Input
                      type="date"
                      lang={locale === 'de' ? 'de-DE' : 'en-US'}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                    />
                    <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/60">{t('lesson_plans.date_hint')}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{locale === 'de' ? 'Uhrzeit' : 'Time'}</Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('lesson.field.duration')}</Label>
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      step={5}
                      value={form.durationMin}
                      onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) || 45 })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="lp-desc">{t('lesson.field.description')}</Label>
                  <Textarea
                    id="lp-desc"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t('lesson.field.description')}
                  />
                </div>

                <Separator />

                {/* Objectives list */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Target className="h-4 w-4 text-emerald-600" />
                    {t('lesson.field.objectives')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newObjective}
                      onChange={(e) => setNewObjective(e.target.value)}
                      placeholder={t('lesson.objective_placeholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addObjective();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addObjective}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {form.objectives.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        {t('lesson.add_objective')}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {form.objectives.map((o, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-md border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 px-2.5 py-1.5 text-sm"
                          >
                            <span className="mt-0.5 text-emerald-600">•</span>
                            <span className="flex-1">{o}</span>
                            <button
                              type="button"
                              onClick={() => removeObjective(idx)}
                              className="text-muted-foreground hover:text-rose-500"
                              aria-label="remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Materials list */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-amber-600" />
                    {t('lesson.field.materials')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={newMaterial}
                      onChange={(e) => setNewMaterial(e.target.value)}
                      placeholder={t('lesson.material_placeholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addMaterial();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addMaterial}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {form.materials.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        {t('lesson.add_material')}
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {form.materials.map((m, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 px-2.5 py-1.5 text-sm"
                          >
                            <span className="mt-0.5 text-amber-600">•</span>
                            <span className="flex-1">{m}</span>
                            <button
                              type="button"
                              onClick={() => removeMaterial(idx)}
                              className="text-muted-foreground hover:text-rose-500"
                              aria-label="remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Homework */}
                <div className="space-y-1.5">
                  <Label htmlFor="lp-hw" className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-teal-600" />
                    {t('lesson.field.homework')}
                  </Label>
                  <Textarea
                    id="lp-hw"
                    rows={2}
                    value={form.homework}
                    onChange={(e) => setForm({ ...form, homework: e.target.value })}
                    placeholder={t('lesson.field.homework')}
                  />
                </div>

                {/* Linked competencies */}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-violet-600" />
                    {t('lesson.field.competencies')}
                  </Label>
                  {allCompetencies.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      {locale === 'de'
                        ? 'Keine Kompetenzen verfügbar — weisen Sie Ihrer Klasse ein Kompetenzraster zu.'
                        : 'No competencies available — assign a competency template to your class first.'}
                    </p>
                  ) : (
                    <ScrollArea className="max-h-48 rounded-md border p-2">
                      <div className="space-y-1">
                        {allCompetencies.map(({ competency, categoryColor }) => {
                          const checked = form.linkedCompetencyIds.includes(competency.id);
                          return (
                            <label
                              key={competency.id}
                              className="flex items-start gap-2 rounded px-2 py-1 hover:bg-accent cursor-pointer"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => toggleCompetency(competency.id)}
                                className="mt-0.5"
                              />
                              <span className="flex-1 text-sm">
                                <span className="font-mono text-[11px] text-muted-foreground">{competency.code}</span>
                                <span className="ml-1.5">{competency.title}</span>
                              </span>
                              <span
                                className="mt-1 h-2 w-2 rounded-full"
                                style={{ backgroundColor: categoryColor }}
                                aria-hidden
                              />
                            </label>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </div>

                {/* Reflection */}
                <div className="space-y-1.5">
                  <Label htmlFor="lp-refl" className="flex items-center gap-1.5">
                    <PencilLine className="h-4 w-4 text-rose-600" />
                    {t('lesson.field.reflection')}
                  </Label>
                  <Textarea
                    id="lp-refl"
                    rows={2}
                    value={form.reflection}
                    onChange={(e) => setForm({ ...form, reflection: e.target.value })}
                    placeholder={t('lesson.field.reflection')}
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="px-6 py-4 border-t flex items-center justify-between bg-muted/30">
            <div>
              {form?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  onClick={() => {
                    setDeleteId(form.id ?? null);
                    setDialogOpen(false);
                  }}
                  disabled={saving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('action.delete')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={closeDialog} disabled={saving}>
                {t('action.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !form?.title.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {t('action.save')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─────────────────────────────────────── */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-500" />
              {t('action.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription>{t('lesson.delete_confirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Lesson card subcomponent ──────────────────────────────────────── */

interface LessonCardProps {
  lesson: LessonPlan;
  className?: string;
  subjectName?: string;
  onEdit: () => void;
  onDelete: () => void;
  locale: string;
  compact?: boolean;
}

function LessonCard({ lesson, subjectName, onEdit, locale, compact }: LessonCardProps) {
  const cfg = STATUS_CONFIG[lesson.status];
  const date = new Date(lesson.date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
    >
      <Card
        className={`cursor-pointer transition-shadow hover:shadow-md border-l-4 ${cfg.badgeClass.split(' ').find((c) => c.startsWith('border-')) ?? 'border-emerald-200'} bg-card`}
        style={{ borderLeftColor: cfg.dotClass.includes('emerald') ? '#10b981' : cfg.dotClass.includes('teal') ? '#14b8a6' : cfg.dotClass.includes('rose') ? '#f43f5e' : '#9ca3af' }}
        onClick={onEdit}
      >
        <CardContent className={compact ? 'p-3' : 'p-4'}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`${cfg.badgeClass} border`}>
                  <cfg.iconComponent className="w-3 h-3 mr-1" />
                  {t(`lesson.status_${lesson.status}`)}
                </Badge>
                {lesson.classGroup && (
                  <Badge variant="outline" className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                    {lesson.classGroup.name}
                  </Badge>
                )}
                {subjectName && (
                  <Badge variant="outline" className="border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300">
                    {subjectName}
                  </Badge>
                )}
              </div>
              <h3 className={`mt-2 font-semibold ${compact ? 'text-sm' : 'text-base'} line-clamp-2 break-words leading-snug`}>
                {lesson.title}
              </h3>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(date, locale)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(date, locale)}
                </span>
                <span className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3" />
                  {lesson.durationMin} {t('lesson.duration_min')}
                </span>
              </div>
              {!compact && lesson.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 break-words">{lesson.description}</p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60 mt-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
