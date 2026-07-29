'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Shield,
  ShieldAlert,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  Filter,
  X,
  Calendar as CalendarIcon,
  MapPin,
  UserCheck,
  Award,
  PieChart as PieChartIcon,
  BarChart3,
  ListChecks,
  Smile,
  Frown,
  Meh,
  Sparkles,
  Handshake,
  Hand,
  AlertTriangle,
  Flame,
  Clock,
  Star,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  Handshake, Hand, AlertTriangle, Flame, Clock, Star, MessageSquare,
  Shield, ShieldAlert, Smile, Frown, Meh, Sparkles, Award, CheckCircle2,
  Circle, Plus, Pencil, Trash2, Filter, X, CalendarIcon,
  MapPin, UserCheck, PieChartIcon, BarChart3, ListChecks, Loader2,
};

function renderLucideIcon(name: string, className?: string): React.ReactNode {
  const IconComp = LUCIDE_ICON_MAP[name];
  if (!IconComp) return null;
  return <IconComp className={className ?? 'h-3.5 w-3.5'} />;
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchBehaviorCategories,
  createBehaviorCategory,
  updateBehaviorCategory,
  deleteBehaviorCategory,
  fetchBehaviorIncidents,
  createBehaviorIncident,
  updateBehaviorIncident,
  deleteBehaviorIncident,
  fetchClasses,
  fetchStudents,
  type BehaviorCategory,
  type BehaviorIncident,
  type BehaviorValence,
  type BehaviorSeverity,
  type BehaviorIncidentInput,
  type BehaviorIncidentUpdate,
  type BehaviorCategoryInput,
  type ClassGroup,
  type Student,
} from '@/lib/api';

/* ── Constants ─────────────────────────────────────────────────────── */

const VALENCES: BehaviorValence[] = ['positive', 'negative', 'neutral'];
const SEVERITIES: BehaviorSeverity[] = ['minor', 'moderate', 'major'];

const SEVERITY_CONFIG: Record<
  BehaviorSeverity,
  { dot: string; badge: string; bar: string }
> = {
  minor: {
    dot: 'bg-emerald-500',
    badge:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    bar: 'bg-emerald-500',
  },
  moderate: {
    dot: 'bg-amber-500',
    badge:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    bar: 'bg-amber-500',
  },
  major: {
    dot: 'bg-rose-500',
    badge:
      'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    bar: 'bg-rose-500',
  },
};

const VALENCE_CONFIG: Record<
  BehaviorValence,
  { gradient: string; ring: string; text: string; bg: string; icon: React.ReactNode }
> = {
  positive: {
    gradient: 'from-emerald-500 to-teal-500',
    ring: 'ring-emerald-200 dark:ring-emerald-800/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    icon: <Smile className="h-4 w-4" />,
  },
  negative: {
    gradient: 'from-rose-500 to-amber-500',
    ring: 'ring-rose-200 dark:ring-rose-800/50',
    text: 'text-rose-700 dark:text-rose-300',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    icon: <Frown className="h-4 w-4" />,
  },
  neutral: {
    gradient: 'from-slate-400 to-slate-500',
    ring: 'ring-slate-200 dark:ring-slate-700/50',
    text: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-50 dark:bg-slate-900/30',
    icon: <Meh className="h-4 w-4" />,
  },
};

const COLOR_PRESETS = [
  '#10b981', // emerald
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#64748b', // slate
  '#84cc16', // lime
  '#ec4899', // pink
];

const LOCATION_OPTIONS = [
  'classroom',
  'playground',
  'hallway',
  'gym',
  'auditorium',
  'library',
  'cafeteria',
  'other',
];

const FOLLOWUP_OPTIONS = [
  'none',
  'parent_talk',
  'detention',
  'praise_circle',
  'note_home',
  'warning',
  'mediation',
  'prize',
];

/* ── Helpers ───────────────────────────────────────────────────────── */

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateShort(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(first: string, last: string): string {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Translate a location value, falling back to a raw string for unknown values. */
function locationLabel(loc: string): string {
  if (LOCATION_OPTIONS.includes(loc as typeof LOCATION_OPTIONS[number])) {
    return t(`behavior.location.${loc}`);
  }
  return loc;
}

/** Translate a follow-up action value, falling back to a raw string for unknown values. */
function followupLabel(fu: string): string {
  if (FOLLOWUP_OPTIONS.includes(fu as typeof FOLLOWUP_OPTIONS[number])) {
    return t(`behavior.followup.${fu}`);
  }
  return fu;
}

/* ── Form state ────────────────────────────────────────────────────── */

interface IncidentFormState {
  id?: string;
  studentId: string;
  categoryId: string;
  classGroupId: string;
  date: string;
  severity: BehaviorSeverity;
  description: string;
  location: string;
  followUpAction: string;
  resolved: boolean;
}

interface CategoryFormState {
  id?: string;
  name: string;
  color: string;
  valence: BehaviorValence;
  icon: string;
}

function emptyIncidentForm(studentId = '', classGroupId = '', categoryId = ''): IncidentFormState {
  const today = new Date();
  return {
    studentId,
    categoryId,
    classGroupId,
    date: toDateInputValue(today),
    severity: 'minor',
    description: '',
    location: 'classroom',
    followUpAction: 'none',
    resolved: false,
  };
}

function emptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    color: COLOR_PRESETS[0],
    valence: 'positive',
    icon: '',
  };
}

function incidentToForm(inc: BehaviorIncident): IncidentFormState {
  return {
    id: inc.id,
    studentId: inc.studentId,
    categoryId: inc.categoryId,
    classGroupId: inc.classGroupId ?? '',
    date: toDateInputValue(new Date(inc.date)),
    severity: inc.severity,
    description: inc.description,
    location: inc.location ?? 'classroom',
    followUpAction: inc.followUpAction ?? 'none',
    resolved: inc.resolved,
  };
}

function categoryToForm(cat: BehaviorCategory): CategoryFormState {
  return {
    id: cat.id,
    name: cat.name,
    color: cat.color,
    valence: cat.valence,
    icon: cat.icon ?? '',
  };
}

/* ── Sub-components ────────────────────────────────────────────────── */

function StudentAvatar({ first, last, size = 'md' }: { first: string; last: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeCls = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold ${sizeCls}`}
      aria-hidden
    >
      {getInitials(first, last)}
    </div>
  );
}

function ValenceBadge({ valence }: { valence: BehaviorValence }) {
  const cfg = VALENCE_CONFIG[valence];
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.bg} ${cfg.text} border-current/20`}>
      {cfg.icon}
      {t(`behavior.valence.${valence}`)}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: BehaviorSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <Badge variant="outline" className={`gap-1 ${cfg.badge}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {t(`behavior.severity.${severity}`)}
    </Badge>
  );
}

function CategoryBadge({ category }: { category: BehaviorIncident['category'] }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
      style={{
        backgroundColor: hexToRgba(category.color, 0.12),
        color: category.color,
        borderColor: hexToRgba(category.color, 0.3),
      }}
    >
      {category.icon && renderLucideIcon(category.icon)}
      {category.name}
    </span>
  );
}

/* ── Main component ────────────────────────────────────────────────── */

export default function BehaviorTrackingView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const schoolYearId = useAppStore((s) => s.schoolYearId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<BehaviorCategory[]>([]);
  const [incidents, setIncidents] = useState<BehaviorIncident[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [tab, setTab] = useState<'incidents' | 'categories' | 'statistics'>('incidents');

  // Filters
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterResolved, setFilterResolved] = useState<string>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Dialogs
  const [incidentDialogOpen, setIncidentDialogOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState<IncidentFormState | null>(null);
  const [incidentDetailOpen, setIncidentDetailOpen] = useState(false);
  const [detailIncident, setDetailIncident] = useState<BehaviorIncident | null>(null);
  const [savingIncident, setSavingIncident] = useState(false);
  const [deleteIncidentId, setDeleteIncidentId] = useState<string | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  const schoolId = currentUser?.schoolId ?? '';

  /* ── Load classes & students ─────────────────────────────────────── */
  useEffect(() => {
    setClassesLoading(true);
    fetchClasses(schoolId || undefined, schoolYearId ?? undefined)
      .then((c) => setClasses(c))
      .catch(() => setClasses([]))
      .finally(() => setClassesLoading(false));
  }, [schoolId, schoolYearId]);

  useEffect(() => {
    fetchStudents(schoolId || undefined, filterClassId !== 'all' ? filterClassId : undefined)
      .then(setStudents)
      .catch(() => setStudents([]));
  }, [schoolId, filterClassId]);

  /* ── Load categories ─────────────────────────────────────────────── */
  const loadCategories = useCallback(async () => {
    if (!schoolId) {
      setCategories([]);
      return;
    }
    setCategoriesLoading(true);
    try {
      const data = await fetchBehaviorCategories(schoolId);
      setCategories(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('behavior.error_load'));
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  /* ── Load incidents ──────────────────────────────────────────────── */
  const loadIncidents = useCallback(async () => {
    if (!schoolId) {
      setIncidents([]);
      return;
    }
    setIncidentsLoading(true);
    try {
      const data = await fetchBehaviorIncidents({
        schoolId,
        classGroupId: filterClassId !== 'all' ? filterClassId : undefined,
        studentId: filterStudentId !== 'all' ? filterStudentId : undefined,
        categoryId: filterCategoryId !== 'all' ? filterCategoryId : undefined,
        severity: filterSeverity !== 'all' ? filterSeverity : undefined,
        resolved: filterResolved !== 'all' ? filterResolved : undefined,
        dateFrom: filterDateFrom || undefined,
        dateTo: filterDateTo || undefined,
      });
      setIncidents(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('behavior.error_load'));
      setIncidents([]);
    } finally {
      setIncidentsLoading(false);
    }
  }, [schoolId, filterClassId, filterStudentId, filterCategoryId, filterSeverity, filterResolved, filterDateFrom, filterDateTo]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  /* ── Incident actions ────────────────────────────────────────────── */
  const openCreateIncident = () => {
    if (categories.length === 0) {
      toast.error(t('behavior.empty_categories_desc'));
      return;
    }
    const presetStudent = filterStudentId !== 'all' ? filterStudentId : '';
    const presetClass = filterClassId !== 'all' ? filterClassId : '';
    setIncidentForm(emptyIncidentForm(presetStudent, presetClass, categories[0]?.id ?? ''));
    setIncidentDialogOpen(true);
  };

  const openEditIncident = (inc: BehaviorIncident) => {
    setIncidentForm(incidentToForm(inc));
    setIncidentDetailOpen(false);
    setIncidentDialogOpen(true);
  };

  const openDetail = (inc: BehaviorIncident) => {
    setDetailIncident(inc);
    setIncidentDetailOpen(true);
  };

  const closeIncidentDialog = () => {
    if (savingIncident) return;
    setIncidentDialogOpen(false);
    setIncidentForm(null);
  };

  const handleSaveIncident = async () => {
    if (!incidentForm) return;
    if (!incidentForm.studentId) {
      toast.error(t('behavior.required_student'));
      return;
    }
    if (!incidentForm.categoryId) {
      toast.error(t('behavior.required_category'));
      return;
    }
    if (!incidentForm.description.trim()) {
      toast.error(t('behavior.required_description'));
      return;
    }
    setSavingIncident(true);
    try {
      const payload: IncidentFormState = incidentForm;
      const base: Omit<BehaviorIncidentInput, 'schoolId'> = {
        studentId: payload.studentId,
        classGroupId: payload.classGroupId || null,
        categoryId: payload.categoryId,
        date: new Date(payload.date).toISOString(),
        severity: payload.severity,
        description: payload.description.trim(),
        location: payload.location || null,
        followUpAction: payload.followUpAction && payload.followUpAction !== 'none' ? payload.followUpAction : null,
        resolved: payload.resolved,
      };
      if (payload.id) {
        const update: BehaviorIncidentUpdate = { ...base };
        await updateBehaviorIncident(payload.id, update);
      } else {
        await createBehaviorIncident({ ...base, schoolId });
      }
      toast.success(t('behavior.saved_incident'));
      setIncidentDialogOpen(false);
      setIncidentForm(null);
      await loadIncidents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('behavior.error_save'));
    } finally {
      setSavingIncident(false);
    }
  };

  const handleToggleResolved = async (inc: BehaviorIncident) => {
    try {
      await updateBehaviorIncident(inc.id, { resolved: !inc.resolved });
      toast.success(inc.resolved ? t('behavior.marked_unresolved') : t('behavior.marked_resolved'));
      await loadIncidents();
      // If detail dialog is open, update it too
      if (detailIncident?.id === inc.id) {
        setDetailIncident({ ...inc, resolved: !inc.resolved });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('behavior.error_save'));
    }
  };

  const handleDeleteIncident = async () => {
    if (!deleteIncidentId) return;
    try {
      await deleteBehaviorIncident(deleteIncidentId);
      toast.success(t('behavior.deleted_incident'));
      setDeleteIncidentId(null);
      if (detailIncident?.id === deleteIncidentId) {
        setIncidentDetailOpen(false);
        setDetailIncident(null);
      }
      await loadIncidents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('behavior.error_delete'));
    }
  };

  /* ── Category actions ────────────────────────────────────────────── */
  const openCreateCategory = () => {
    setCategoryForm(emptyCategoryForm());
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (cat: BehaviorCategory) => {
    setCategoryForm(categoryToForm(cat));
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    if (savingCategory) return;
    setCategoryDialogOpen(false);
    setCategoryForm(null);
  };

  const handleSaveCategory = async () => {
    if (!categoryForm) return;
    if (!categoryForm.name.trim()) {
      toast.error(t('behavior.field.name'));
      return;
    }
    setSavingCategory(true);
    try {
      const payload: Omit<BehaviorCategoryInput, 'schoolId'> = {
        name: categoryForm.name.trim(),
        color: categoryForm.color,
        valence: categoryForm.valence,
        icon: categoryForm.icon.trim() || null,
      };
      if (categoryForm.id) {
        await updateBehaviorCategory(categoryForm.id, payload);
      } else {
        await createBehaviorCategory({ ...payload, schoolId });
      }
      toast.success(t('behavior.saved_category'));
      setCategoryDialogOpen(false);
      setCategoryForm(null);
      await loadCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('behavior.error_save');
      if (msg.includes('already exists')) {
        toast.error(t('behavior.duplicate_category'));
      } else {
        toast.error(msg);
      }
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await deleteBehaviorCategory(deleteCategoryId);
      toast.success(t('behavior.deleted_category'));
      setDeleteCategoryId(null);
      await loadCategories();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('behavior.error_delete');
      if (msg.includes('Cannot delete') || msg.includes('referenced')) {
        toast.error(t('behavior.delete_category_blocked'));
      } else {
        toast.error(msg);
      }
    }
  };

  /* ── Statistics computations ─────────────────────────────────────── */
  const stats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = incidents.filter((i) => new Date(i.date) >= startOfMonth);
    const totalThisMonth = thisMonth.length;
    const positiveCount = thisMonth.filter((i) => i.category.valence === 'positive').length;
    const negativeCount = thisMonth.filter((i) => i.category.valence === 'negative').length;
    const resolvedCount = thisMonth.filter((i) => i.resolved).length;
    const resolutionRate = totalThisMonth > 0 ? Math.round((resolvedCount / totalThisMonth) * 100) : 0;

    // By category (use ALL incidents for richer chart)
    const byCatMap = new Map<string, { name: string; count: number; color: string; valence: BehaviorValence }>();
    for (const inc of incidents) {
      const existing = byCatMap.get(inc.categoryId);
      if (existing) existing.count += 1;
      else byCatMap.set(inc.categoryId, { name: inc.category.name, count: 1, color: inc.category.color, valence: inc.category.valence });
    }
    const byCategory = Array.from(byCatMap.values()).sort((a, b) => b.count - a.count);

    // By valence distribution (use ALL incidents)
    const valenceCounts = { positive: 0, negative: 0, neutral: 0 };
    for (const inc of incidents) valenceCounts[inc.category.valence] += 1;
    const byValence = [
      { name: t('behavior.valence.positive'), value: valenceCounts.positive, color: '#10b981' },
      { name: t('behavior.valence.negative'), value: valenceCounts.negative, color: '#f43f5e' },
      { name: t('behavior.valence.neutral'), value: valenceCounts.neutral, color: '#64748b' },
    ].filter((v) => v.value > 0);

    // Top 5 students by incident count (split positive/negative)
    const byStudentMap = new Map<
      string,
      {
        studentId: string;
        firstName: string;
        lastName: string;
        positive: number;
        negative: number;
        neutral: number;
        total: number;
      }
    >();
    for (const inc of incidents) {
      const existing = byStudentMap.get(inc.studentId);
      if (existing) {
        existing[inc.category.valence] += 1;
        existing.total += 1;
      } else {
        byStudentMap.set(inc.studentId, {
          studentId: inc.studentId,
          firstName: inc.student.firstName,
          lastName: inc.student.lastName,
          positive: inc.category.valence === 'positive' ? 1 : 0,
          negative: inc.category.valence === 'negative' ? 1 : 0,
          neutral: inc.category.valence === 'neutral' ? 1 : 0,
          total: 1,
        });
      }
    }
    const topStudents = Array.from(byStudentMap.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      totalThisMonth,
      positiveCount,
      negativeCount,
      resolutionRate,
      byCategory,
      byValence,
      topStudents,
      totalAll: incidents.length,
    };
  }, [incidents]);

  /* ── Derived ─────────────────────────────────────────────────────── */
  const isFiltered =
    filterClassId !== 'all' ||
    filterStudentId !== 'all' ||
    filterCategoryId !== 'all' ||
    filterSeverity !== 'all' ||
    filterResolved !== 'all' ||
    filterDateFrom !== '' ||
    filterDateTo !== '';

  const clearFilters = () => {
    setFilterClassId('all');
    setFilterStudentId('all');
    setFilterCategoryId('all');
    setFilterSeverity('all');
    setFilterResolved('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              {t('behavior.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('behavior.subtitle')}</p>
          </div>

          {/* Class selector */}
          <div className="flex items-center gap-2">
            <Select value={filterClassId} onValueChange={(v) => { setFilterClassId(v); setFilterStudentId('all'); }}>
              <SelectTrigger className="w-[180px] sm:w-[220px] rounded-xl border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 ring-1 ring-emerald-200/40 dark:ring-emerald-800/30 [&_svg]:text-emerald-500">
                <SelectValue placeholder={t('behavior.select_class')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('behavior.all_classes')}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.gradeLevel}. Klasse)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-900/30">
          <TabsTrigger
            value="incidents"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-emerald-300"
          >
            <Shield className="h-4 w-4 mr-1.5" />
            {t('behavior.tab_incidents')}
            {incidents.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-1">
                {incidents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-emerald-300"
          >
            <ListChecks className="h-4 w-4 mr-1.5" />
            {t('behavior.tab_categories')}
          </TabsTrigger>
          <TabsTrigger
            value="statistics"
            className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-emerald-300"
          >
            <BarChart3 className="h-4 w-4 mr-1.5" />
            {t('behavior.tab_statistics')}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Incidents ─────────────────────────────────────────── */}
        <TabsContent value="incidents" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="incidents-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Filter row */}
              <Card className="border-0 shadow-sm rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Filter className="h-4 w-4 text-emerald-500" />
                      {t('behavior.filter_section')}
                    </div>
                    <div className="flex items-center gap-2">
                      {isFiltered && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          {t('behavior.cancel')}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={openCreateIncident}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('behavior.add_incident')}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.filter.date_from')}</Label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.filter.date_to')}</Label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.filter.category')}</Label>
                      <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('behavior.all_categories')}</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.icon && <span className="mr-1">{c.icon}</span>}
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.filter.severity')}</Label>
                      <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('behavior.all_severities')}</SelectItem>
                          {SEVERITIES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {t(`behavior.severity.${s}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.filter.student')}</Label>
                      <Select value={filterStudentId} onValueChange={setFilterStudentId}>
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('behavior.all_students')}</SelectItem>
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.firstName} {s.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.filter.resolved')}</Label>
                      <Select value={filterResolved} onValueChange={setFilterResolved}>
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('behavior.all_resolved')}</SelectItem>
                          <SelectItem value="false">{t('behavior.unresolved')}</SelectItem>
                          <SelectItem value="true">{t('behavior.resolved')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Incidents list */}
              {incidentsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : incidents.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardContent className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 mb-4">
                      <ShieldAlert className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                      {isFiltered ? t('behavior.empty_incidents_filtered') : t('behavior.empty_incidents')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                      {isFiltered ? t('behavior.empty_incidents_filtered_desc') : t('behavior.empty_incidents_desc')}
                    </p>
                    {!isFiltered && (
                      <Button
                        onClick={openCreateIncident}
                        className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('behavior.add_incident')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {incidents.map((inc, idx) => (
                    <motion.div
                      key={inc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.4) }}
                    >
                      <Card
                        className="border-0 shadow-sm rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                        onClick={() => openDetail(inc)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <StudentAvatar first={inc.student.firstName} last={inc.student.lastName} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">
                                    {inc.student.firstName} {inc.student.lastName}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                                    <CalendarIcon className="h-3 w-3" />
                                    {formatDateShort(inc.date, locale)}
                                    {inc.classGroup && (
                                      <>
                                        <span className="mx-0.5">·</span>
                                        <span className="font-medium">{inc.classGroup.name}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {inc.resolved ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800/50">
                                      <CheckCircle2 className="h-3 w-3" />
                                      {t('behavior.resolved')}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 text-[10px] font-semibold border border-slate-200 dark:border-slate-700/50">
                                      <Circle className="h-3 w-3" />
                                      {t('behavior.unresolved')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <CategoryBadge category={inc.category} />
                                <SeverityBadge severity={inc.severity} />
                                {inc.location && (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                    <MapPin className="h-3 w-3" />
                                    {locationLabel(inc.location)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2 break-words">
                                {inc.description}
                              </p>
                              {inc.followUpAction && inc.followUpAction !== 'none' && (
                                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 text-[11px] font-medium">
                                  <Sparkles className="h-3 w-3" />
                                  {followupLabel(inc.followUpAction)}
                                </div>
                              )}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/60">
                                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                                  {t('behavior.by_teacher')}:{' '}
                                  <span className="font-medium">
                                    {inc.teacher.firstName} {inc.teacher.lastName}
                                  </span>
                                </div>
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => handleToggleResolved(inc)}
                                  >
                                    {inc.resolved ? (
                                      <>
                                        <Circle className="h-3.5 w-3.5 mr-1" />
                                        {t('behavior.mark_unresolved')}
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                        {t('behavior.mark_resolved')}
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => openEditIncident(inc)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:text-rose-600"
                                    onClick={() => setDeleteIncidentId(inc.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ── Tab: Categories ────────────────────────────────────────── */}
        <TabsContent value="categories" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="categories-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-end">
                <Button
                  onClick={openCreateCategory}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('behavior.add_category')}
                </Button>
              </div>

              {categoriesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                </div>
              ) : categories.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardContent className="py-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-500 mb-4">
                      <ListChecks className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('behavior.empty_categories')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('behavior.empty_categories_desc')}</p>
                    <Button
                      onClick={openCreateCategory}
                      className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('behavior.add_category')}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categories.map((cat, idx) => {
                    const cfg = VALENCE_CONFIG[cat.valence];
                    return (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, delay: Math.min(idx * 0.05, 0.4) }}
                      >
                        <Card className="border-0 shadow-sm rounded-xl overflow-hidden h-full">
                          <div className={`h-1 bg-gradient-to-r ${cfg.gradient}`} />
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
                                  style={{ backgroundColor: hexToRgba(cat.color, 0.15), color: cat.color }}
                                >
                                  {cat.icon || cat.name[0]}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{cat.name}</div>
                                  <ValenceBadge valence={cat.valence} />
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditCategory(cat)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 hover:text-rose-600"
                                  onClick={() => setDeleteCategoryId(cat.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between text-[11px]">
                              <span className="text-gray-500 dark:text-gray-400">
                                {t('behavior.incidents_count')}: <span className="font-semibold text-gray-700 dark:text-gray-300">{cat._count?.incidents ?? 0}</span>
                              </span>
                              <span
                                className="inline-block w-6 h-6 rounded-md border border-gray-200 dark:border-gray-700"
                                style={{ backgroundColor: cat.color }}
                                title={cat.color}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </TabsContent>

        {/* ── Tab: Statistics ────────────────────────────────────────── */}
        <TabsContent value="statistics" className="mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="stats-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* KPI tiles */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiTile
                  title={t('behavior.stat.this_month')}
                  value={String(stats.totalThisMonth)}
                  icon={<Shield className="h-5 w-5" />}
                  gradient="from-emerald-500 to-teal-500"
                />
                <KpiTile
                  title={t('behavior.stat.positive')}
                  value={String(stats.positiveCount)}
                  icon={<Smile className="h-5 w-5" />}
                  gradient="from-teal-500 to-emerald-500"
                />
                <KpiTile
                  title={t('behavior.stat.negative')}
                  value={String(stats.negativeCount)}
                  icon={<Frown className="h-5 w-5" />}
                  gradient="from-rose-500 to-amber-500"
                />
                <KpiTile
                  title={t('behavior.stat.resolution_rate')}
                  value={`${stats.resolutionRate}%`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  gradient="from-violet-500 to-emerald-500"
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar chart by category */}
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      {t('behavior.stat.by_category')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.byCategory.length === 0 ? (
                      <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('behavior.stat.no_data')}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={stats.byCategory} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            interval={0}
                            angle={-15}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} allowDecimals={false} />
                          <RTooltip
                            cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                            contentStyle={{ borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '12px', boxShadow: '0 4px 12px rgba(16,185,129,0.1)' }}
                          />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                            {stats.byCategory.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Pie chart by valence */}
                <Card className="border-0 shadow-sm rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400">
                        <PieChartIcon className="h-4 w-4" />
                      </div>
                      {t('behavior.stat.by_valence')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {stats.byValence.length === 0 ? (
                      <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('behavior.stat.no_data')}</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={stats.byValence}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={95}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                          >
                            {stats.byValence.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <RTooltip
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top 5 students */}
              <Card className="border-0 shadow-sm rounded-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                      <Award className="h-4 w-4" />
                    </div>
                    {t('behavior.stat.top_students')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.topStudents.length === 0 ? (
                    <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('behavior.stat.no_data')}</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.topStudents.map((s, idx) => {
                        const max = stats.topStudents[0].total || 1;
                        const posPct = (s.positive / max) * 100;
                        const negPct = (s.negative / max) * 100;
                        const neuPct = (s.neutral / max) * 100;
                        return (
                          <div key={s.studentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                              {idx + 1}
                            </div>
                            <StudentAvatar first={s.firstName} last={s.lastName} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {s.firstName} {s.lastName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                                    <Smile className="h-3 w-3" /> {s.positive}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 text-rose-600 dark:text-rose-400">
                                    <Frown className="h-3 w-3" /> {s.negative}
                                  </span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">· {s.total}</span>
                                </div>
                              </div>
                              <div className="mt-1 flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                                <div className="bg-emerald-500" style={{ width: `${posPct}%` }} />
                                <div className="bg-rose-500" style={{ width: `${negPct}%` }} />
                                <div className="bg-slate-400" style={{ width: `${neuPct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </TabsContent>
      </Tabs>

      {/* ── Incident Form Dialog ─────────────────────────────────────── */}
      <Dialog open={incidentDialogOpen} onOpenChange={(o) => { if (!o) closeIncidentDialog(); }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              {incidentForm?.id ? t('behavior.edit_incident') : t('behavior.add_incident')}
            </DialogTitle>
            <DialogDescription>{t('behavior.subtitle')}</DialogDescription>
          </DialogHeader>

          {incidentForm && (
            <div className="space-y-3 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">{t('behavior.field.student')}</Label>
                  <Select value={incidentForm.studentId} onValueChange={(v) => setIncidentForm({ ...incidentForm, studentId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('behavior.all_students')} /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">{t('behavior.field.class')}</Label>
                  <Select value={incidentForm.classGroupId} onValueChange={(v) => setIncidentForm({ ...incidentForm, classGroupId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('behavior.all_classes')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('behavior.all_classes')}</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">{t('behavior.field.category')}</Label>
                  <Select value={incidentForm.categoryId} onValueChange={(v) => setIncidentForm({ ...incidentForm, categoryId: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon && <span className="mr-1">{c.icon}</span>}
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">{t('behavior.field.severity')}</Label>
                  <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v as BehaviorSeverity })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>{t(`behavior.severity.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">{t('behavior.field.date')}</Label>
                  <Input
                    type="date"
                    value={incidentForm.date}
                    onChange={(e) => setIncidentForm({ ...incidentForm, date: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">{t('behavior.field.location')}</Label>
                  <Select value={incidentForm.location} onValueChange={(v) => setIncidentForm({ ...incidentForm, location: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>{t(`behavior.location.${loc}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">{t('behavior.field.description')}</Label>
                <Textarea
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder={t('behavior.description_placeholder')}
                  className="mt-1 min-h-[80px]"
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t('behavior.field.follow_up')}</Label>
                <Select value={incidentForm.followUpAction} onValueChange={(v) => setIncidentForm({ ...incidentForm, followUpAction: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_OPTIONS.map((fu) => (
                      <SelectItem key={fu} value={fu}>{t(`behavior.followup.${fu}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-900/40">
                <input
                  type="checkbox"
                  checked={incidentForm.resolved}
                  onChange={(e) => setIncidentForm({ ...incidentForm, resolved: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('behavior.field.resolved')}</span>
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeIncidentDialog} disabled={savingIncident}>
              {t('behavior.cancel')}
            </Button>
            <Button
              onClick={handleSaveIncident}
              disabled={savingIncident}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {savingIncident ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              {t('behavior.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Incident Detail Dialog ───────────────────────────────────── */}
      <Dialog open={incidentDetailOpen} onOpenChange={(o) => { if (!o) { setIncidentDetailOpen(false); setDetailIncident(null); } }}>
        <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
          {detailIncident && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  {t('behavior.detail')}
                </DialogTitle>
                <DialogDescription>
                  {formatDateTime(detailIncident.date, locale)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30">
                  <StudentAvatar first={detailIncident.student.firstName} last={detailIncident.student.lastName} size="lg" />
                  <div>
                    <div className="font-bold text-gray-800 dark:text-gray-200">
                      {detailIncident.student.firstName} {detailIncident.student.lastName}
                    </div>
                    {detailIncident.classGroup && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {detailIncident.classGroup.name} · {detailIncident.classGroup.gradeLevel}. Klasse
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={detailIncident.category} />
                  <SeverityBadge severity={detailIncident.severity} />
                  {detailIncident.resolved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/50">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('behavior.resolved')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 text-xs font-semibold border border-slate-200 dark:border-slate-700/50">
                      <Circle className="h-3 w-3" />
                      {t('behavior.unresolved')}
                    </span>
                  )}
                </div>

                <div>
                  <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.field.description')}</Label>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                    {detailIncident.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {detailIncident.location && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.field.location')}</Label>
                      <div className="mt-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                        {locationLabel(detailIncident.location)}
                      </div>
                    </div>
                  )}
                  {detailIncident.followUpAction && detailIncident.followUpAction !== 'none' && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.field.follow_up')}</Label>
                      <div className="mt-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                        {followupLabel(detailIncident.followUpAction)}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.by_teacher')}</Label>
                    <div className="mt-1 flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <UserCheck className="h-3.5 w-3.5 text-teal-500" />
                      {detailIncident.teacher.firstName} {detailIncident.teacher.lastName}
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.created_at')}</Label>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      {formatDateTime(detailIncident.createdAt, locale)}
                    </div>
                  </div>
                  {detailIncident.resolved && detailIncident.resolvedBy && detailIncident.resolvedAt && (
                    <div>
                      <Label className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('behavior.resolved_by')}</Label>
                      <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                        {detailIncident.resolvedBy.firstName} {detailIncident.resolvedBy.lastName} · {formatDateTime(detailIncident.resolvedAt, locale)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleToggleResolved(detailIncident)}
                  className="flex-1"
                >
                  {detailIncident.resolved ? (
                    <>
                      <Circle className="h-4 w-4 mr-1" />
                      {t('behavior.mark_unresolved')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {t('behavior.mark_resolved')}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => openEditIncident(detailIncident)} className="flex-1">
                  <Pencil className="h-4 w-4 mr-1" />
                  {t('behavior.edit')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteIncidentId(detailIncident.id)}
                  className="flex-1 hover:text-rose-600 hover:border-rose-300"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t('behavior.delete')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Category Form Dialog ─────────────────────────────────────── */}
      <Dialog open={categoryDialogOpen} onOpenChange={(o) => { if (!o) closeCategoryDialog(); }}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-500" />
              {categoryForm?.id ? t('behavior.edit_category') : t('behavior.add_category')}
            </DialogTitle>
            <DialogDescription>{t('behavior.empty_categories_desc')}</DialogDescription>
          </DialogHeader>

          {categoryForm && (
            <div className="space-y-3 py-1">
              <div>
                <Label className="text-xs font-semibold">{t('behavior.field.name')}</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder={t('behavior.name_placeholder')}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">{t('behavior.field.valence')}</Label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {VALENCES.map((v) => {
                    const cfg = VALENCE_CONFIG[v];
                    const active = categoryForm.valence === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, valence: v })}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                          active
                            ? `${cfg.bg} ${cfg.text} border-current shadow-sm`
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {cfg.icon}
                        {t(`behavior.valence.${v}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">{t('behavior.field.color')}</Label>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCategoryForm({ ...categoryForm, color })}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform ${
                        categoryForm.color === color ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                  <Input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                    className="w-10 h-8 p-1 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-800"
                  />
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('behavior.color_helper')}</p>
              </div>

              <div>
                <Label className="text-xs font-semibold">{t('behavior.field.icon')}</Label>
                <Input
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="🤝"
                  className="mt-1"
                  maxLength={4}
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('behavior.icon_helper')}</p>
              </div>

              {/* Live preview */}
              <div className="mt-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800/60">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">{t('behavior.preview')}</div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ backgroundColor: hexToRgba(categoryForm.color, 0.15), color: categoryForm.color }}
                  >
                    {categoryForm.icon || categoryForm.name[0] || '?'}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                      style={{
                        backgroundColor: hexToRgba(categoryForm.color, 0.12),
                        color: categoryForm.color,
                        borderColor: hexToRgba(categoryForm.color, 0.3),
                      }}
                    >
                      {categoryForm.name || t('behavior.name_placeholder')}
                    </span>
                    <ValenceBadge valence={categoryForm.valence} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeCategoryDialog} disabled={savingCategory}>
              {t('behavior.cancel')}
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={savingCategory}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {savingCategory ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              {t('behavior.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Incident Confirmation ─────────────────────────────── */}
      <AlertDialog open={!!deleteIncidentId} onOpenChange={(o) => { if (!o) setDeleteIncidentId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('behavior.delete_incident_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('behavior.delete_incident_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('behavior.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIncident}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {t('behavior.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Category Confirmation ─────────────────────────────── */}
      <AlertDialog open={!!deleteCategoryId} onOpenChange={(o) => { if (!o) setDeleteCategoryId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('behavior.delete_category_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('behavior.delete_category_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('behavior.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {t('behavior.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── KPI Tile component ────────────────────────────────────────────── */

function KpiTile({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden h-full">
        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold leading-tight break-words">
                {title}
              </div>
              <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</div>
            </div>
            <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-sm`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
