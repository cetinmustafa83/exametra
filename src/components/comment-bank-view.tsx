'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Loader2,
  Search,
  Eye,
  Globe,
  Lock,
  Tag,
  BookOpen,
  BarChart3,
  ListChecks,
  MessageSquareText,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

const LUCIDE_ICON_MAP_CB: Record<string, LucideIcon> = {
  MessageSquare, MessageSquareText, BookOpen, Plus, Pencil, Trash2, Copy, Loader2, Search, Eye, Globe, Lock, Tag, BarChart3, ListChecks,
};

function renderCBIcon(name: string, className?: string): React.ReactNode {
  const IconComp = LUCIDE_ICON_MAP_CB[name];
  if (!IconComp) return null;
  return <IconComp className={className ?? 'h-3.5 w-3.5 inline'} />;
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchCommentCategories,
  createCommentCategory,
  updateCommentCategory,
  deleteCommentCategory,
  fetchCommentBank,
  createCommentBankEntry,
  updateCommentBankEntry,
  deleteCommentBankEntry,
  fetchSubjects,
  type CommentCategory,
  type CommentBankEntry,
  type CommentBankEntryInput,
  type CommentBankEntryUpdate,
  type Subject as ApiSubject,
} from '@/lib/api';

/* ── Constants ─────────────────────────────────────────────────────── */

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

const GRADE_LEVEL_OPTIONS = ['all', '1', '2', '3', '3-4', '4', '5', '5-6', '6'];

/* ── Helpers ───────────────────────────────────────────────────────── */

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ── Form state ────────────────────────────────────────────────────── */

interface EntryFormState {
  id?: string;
  categoryId: string;
  subjectId: string;
  title: string;
  text: string;
  gradeLevel: string;
  schoolType: string;
  isPublic: boolean;
  tags: string;
}

interface CategoryFormState {
  id?: string;
  name: string;
  color: string;
  icon: string;
}

function emptyEntryForm(categoryId = ''): EntryFormState {
  return {
    categoryId,
    subjectId: 'none',
    title: '',
    text: '',
    gradeLevel: 'all',
    schoolType: 'ELEMENTARY',
    isPublic: false,
    tags: '',
  };
}

function emptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    color: '#10b981',
    icon: '',
  };
}

/* ── View Component ────────────────────────────────────────────────── */

export default function CommentBankView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const schoolId = currentUser?.schoolId ?? '';

  // Data state
  const [categories, setCategories] = useState<CommentCategory[]>([]);
  const [entries, setEntries] = useState<CommentBankEntry[]>([]);
  const [subjects, setSubjects] = useState<ApiSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterGradeLevel, setFilterGradeLevel] = useState('all');
  const [filterPublic, setFilterPublic] = useState('all');

  // Active tab
  const [activeTab, setActiveTab] = useState('entries');

  // Dialog state — entries
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm());
  const [entryDetailOpen, setEntryDetailOpen] = useState(false);
  const [entryDetailData, setEntryDetailData] = useState<CommentBankEntry | null>(null);
  const [deleteEntryOpen, setDeleteEntryOpen] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState('');

  // Dialog state — categories
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm());
  const [deleteCategoryOpen, setDeleteCategoryOpen] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState('');

  /* ── Data loading ──────────────────────────────────────────────────── */

  const loadAll = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const [cats, ents, subs] = await Promise.all([
        fetchCommentCategories(schoolId),
        fetchCommentBank({ schoolId }),
        fetchSubjects(schoolId),
      ]);
      setCategories(cats);
      setEntries(ents);
      setSubjects(subs);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  /* ── Filtered entries ─────────────────────────────────────────────── */

  const filteredEntries = useMemo(() => {
    let list = entries;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.text.toLowerCase().includes(q) ||
          (e.tags && e.tags.toLowerCase().includes(q))
      );
    }
    if (filterCategory !== 'all') {
      list = list.filter((e) => e.categoryId === filterCategory);
    }
    if (filterSubject !== 'all') {
      list = list.filter((e) => e.subjectId === filterSubject);
    }
    if (filterGradeLevel !== 'all') {
      list = list.filter((e) => e.gradeLevel === filterGradeLevel);
    }
    if (filterPublic === 'true') {
      list = list.filter((e) => e.isPublic);
    } else if (filterPublic === 'false') {
      list = list.filter((e) => !e.isPublic);
    }
    return list;
  }, [entries, searchQuery, filterCategory, filterSubject, filterGradeLevel, filterPublic]);

  /* ── Statistics ────────────────────────────────────────────────────── */

  const stats = useMemo(() => {
    const totalEntries = entries.length;
    const publicEntries = entries.filter((e) => e.isPublic).length;
    const totalCategories = categories.length;
    const mostUsed = entries.reduce((best, e) => (e.usageCount > (best?.usageCount ?? 0) ? e : best), null as CommentBankEntry | null);

    // Bar chart data: entries by category
    const byCategory = categories.map((cat) => ({
      name: cat.icon ? `${cat.icon} ${cat.name}` : cat.name,
      count: entries.filter((e) => e.categoryId === cat.id).length,
      fill: cat.color,
    }));

    // Top 5 most-used
    const topUsed = [...entries]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    return { totalEntries, publicEntries, totalCategories, mostUsed, byCategory, topUsed };
  }, [entries, categories]);

  /* ── Entry CRUD ────────────────────────────────────────────────────── */

  const openEntryDialog = useCallback(
    (editEntry?: CommentBankEntry) => {
      if (editEntry) {
        setEntryForm({
          id: editEntry.id,
          categoryId: editEntry.categoryId,
          subjectId: editEntry.subjectId ?? 'none',
          title: editEntry.title,
          text: editEntry.text,
          gradeLevel: editEntry.gradeLevel ?? 'all',
          schoolType: editEntry.schoolType ?? 'ELEMENTARY',
          isPublic: editEntry.isPublic,
          tags: editEntry.tags ?? '',
        });
      } else {
        setEntryForm(emptyEntryForm(categories[0]?.id ?? ''));
      }
      setEntryDialogOpen(true);
    },
    [categories]
  );

  const saveEntry = useCallback(async () => {
    if (!entryForm.title.trim() || !entryForm.text.trim() || !entryForm.categoryId) {
      toast.error(t('comments.validation_required'));
      return;
    }
    try {
      const payload: CommentBankEntryInput | CommentBankEntryUpdate = {
        schoolId,
        categoryId: entryForm.categoryId,
        subjectId: entryForm.subjectId === 'none' ? null : entryForm.subjectId,
        title: entryForm.title.trim(),
        text: entryForm.text.trim(),
        gradeLevel: entryForm.gradeLevel === 'all' ? null : entryForm.gradeLevel,
        schoolType: entryForm.schoolType || null,
        isPublic: entryForm.isPublic,
        tags: entryForm.tags.trim() || null,
      };

      if (entryForm.id) {
        // Update
        await updateCommentBankEntry(entryForm.id, payload);
        toast.success(t('comments.saved'));
      } else {
        // Create
        await createCommentBankEntry(payload as CommentBankEntryInput);
        toast.success(t('comments.created'));
      }
      setEntryDialogOpen(false);
      loadAll();
    } catch (err) {
      toast.error(String(err));
    }
  }, [entryForm, schoolId, loadAll]);

  const handleDeleteEntry = useCallback(async () => {
    try {
      await deleteCommentBankEntry(deleteEntryId);
      toast.success(t('comments.deleted'));
      setDeleteEntryOpen(false);
      loadAll();
    } catch (err) {
      toast.error(String(err));
    }
  }, [deleteEntryId, loadAll]);

  const copyEntryText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('comments.copy_success'));
  }, []);

  const incrementUsage = useCallback(async (id: string) => {
    try {
      await updateCommentBankEntry(id, { incrementUsage: true });
      loadAll();
    } catch {
      // silent fail
    }
  }, [loadAll]);

  /* ── Category CRUD ──────────────────────────────────────────────────── */

  const openCategoryDialog = useCallback(
    (editCat?: CommentCategory) => {
      if (editCat) {
        setCategoryForm({
          id: editCat.id,
          name: editCat.name,
          color: editCat.color,
          icon: editCat.icon ?? '',
        });
      } else {
        setCategoryForm(emptyCategoryForm());
      }
      setCategoryDialogOpen(true);
    },
    []
  );

  const saveCategory = useCallback(async () => {
    if (!categoryForm.name.trim()) {
      toast.error(t('comments.category_name_required'));
      return;
    }
    try {
      if (categoryForm.id) {
        await updateCommentCategory(categoryForm.id, {
          name: categoryForm.name.trim(),
          color: categoryForm.color,
          icon: categoryForm.icon || null,
        });
        toast.success(t('comments.category_saved'));
      } else {
        await createCommentCategory({
          schoolId,
          name: categoryForm.name.trim(),
          color: categoryForm.color,
          icon: categoryForm.icon || null,
        });
        toast.success(t('comments.category_created'));
      }
      setCategoryDialogOpen(false);
      loadAll();
    } catch (err) {
      toast.error(String(err));
    }
  }, [categoryForm, schoolId, loadAll]);

  const handleDeleteCategory = useCallback(async () => {
    try {
      await deleteCommentCategory(deleteCategoryId);
      toast.success(t('comments.category_deleted'));
      setDeleteCategoryOpen(false);
      loadAll();
    } catch (err) {
      toast.error(String(err));
    }
  }, [deleteCategoryId, loadAll]);

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <p className="text-rose-600 font-semibold">{t('comments.error')}</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
            <Button onClick={loadAll} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
              {t('action.refresh')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 p-4 md:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t('comments.title')}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('comments.subtitle')}</p>
        </div>
        <Button
          onClick={() => openEntryDialog()}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('comments.create_entry')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="entries">
            <MessageSquareText className="h-4 w-4 mr-2" />
            {t('comments.tab_entries')}
          </TabsTrigger>
          <TabsTrigger value="categories">
            <ListChecks className="h-4 w-4 mr-2" />
            {t('comments.tab_categories')}
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('comments.tab_statistics')}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Entries ──────────────────────────────────────── */}
        <TabsContent value="entries" className="space-y-4 mt-4">
          {/* Search + Filters */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('comments.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('comments.filter_category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('comments.all_categories')}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('comments.filter_subject')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('comments.all_subjects')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterGradeLevel} onValueChange={setFilterGradeLevel}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t('comments.filter_grade')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('comments.all_grades')}</SelectItem>
                  {GRADE_LEVEL_OPTIONS.filter((g) => g !== 'all').map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterPublic} onValueChange={setFilterPublic}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t('comments.filter_visibility')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('comments.all_visibility')}</SelectItem>
                  <SelectItem value="true">{t('comments.public_only')}</SelectItem>
                  <SelectItem value="false">{t('comments.private_only')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          {filteredEntries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <MessageSquareText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t('comments.empty_title')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('comments.empty_desc')}</p>
              <Button
                onClick={() => openEntryDialog()}
                className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {t('comments.empty_create')}
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredEntries.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Card
                      className="group hover:shadow-lg transition-shadow cursor-pointer border-l-4"
                      style={{ borderLeftColor: entry.category.color }}
                      onClick={() => {
                        setEntryDetailData(entry);
                        setEntryDetailOpen(true);
                        incrementUsage(entry.id);
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-semibold line-clamp-1">
                            {entry.title}
                          </CardTitle>
                          <div className="flex gap-1 shrink-0">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                backgroundColor: hexToRgba(entry.category.color, 0.15),
                                color: entry.category.color,
                                borderColor: hexToRgba(entry.category.color, 0.3),
                              }}
                            >
                              {entry.category.icon ? renderCBIcon(entry.category.icon) : null}{entry.category.name}
                            </Badge>
                            {entry.isPublic ? (
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                <Globe className="h-3 w-3 mr-1" />
                                {t('comments.public')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700">
                                <Lock className="h-3 w-3 mr-1" />
                                {t('comments.private')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                          {entry.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {entry.subject && (
                            <Badge variant="secondary" className="text-xs">
                              <BookOpen className="h-3 w-3 mr-1" />
                              {entry.subject.name}
                            </Badge>
                          )}
                          {entry.gradeLevel && (
                            <Badge variant="secondary" className="text-xs">
                              Klasse {entry.gradeLevel}
                            </Badge>
                          )}
                          {entry.usageCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {t('comments.usage_count')}: {entry.usageCount}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {entry.teacher.firstName} {entry.teacher.lastName}
                          </span>
                        </div>
                        {/* Action buttons (visible on hover) */}
                        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEntryDialog(entry);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyEntryText(entry.text);
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteEntryId(entry.id);
                              setDeleteEntryOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 2: Categories ───────────────────────────────────── */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('comments.categories_title')}</h2>
            <Button
              onClick={() => openCategoryDialog()}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('comments.add_category')}
            </Button>
          </div>

          {categories.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t('comments.category_empty_title')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('comments.category_empty_desc')}</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {categories.map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <Card
                      className="hover:shadow-md transition-shadow"
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: cat.color,
                      }}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            {cat.icon && <span className="text-xl">{cat.icon}</span>}
                            <span style={{ color: cat.color }}>{cat.name}</span>
                          </CardTitle>
                          <Badge variant="outline" className="text-xs" style={{ backgroundColor: hexToRgba(cat.color, 0.15), color: cat.color, borderColor: hexToRgba(cat.color, 0.3) }}>
                            {cat._count?.comments ?? 0} {t('comments.entries_count')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 pb-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openCategoryDialog(cat)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={() => {
                              setDeleteCategoryId(cat.id);
                              setDeleteCategoryOpen(true);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* ── Tab 3: Statistics ───────────────────────────────────── */}
        <TabsContent value="statistics" className="space-y-6 mt-4">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }}>
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800/50">
                <CardContent className="p-4 text-center">
                  <MessageSquareText className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.totalEntries}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('comments.stat_total')}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border-teal-200 dark:border-teal-800/50">
                <CardContent className="p-4 text-center">
                  <Globe className="h-6 w-6 text-teal-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{stats.publicEntries}</p>
                  <p className="text-xs text-teal-600 dark:text-teal-400">{t('comments.stat_public')}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-amber-50 to-rose-50 dark:from-amber-950/30 dark:to-rose-950/30 border-amber-200 dark:border-amber-800/50">
                <CardContent className="p-4 text-center">
                  <ListChecks className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{stats.totalCategories}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t('comments.stat_categories')}</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <Card className="bg-gradient-to-br from-violet-50 to-rose-50 dark:from-violet-950/30 dark:to-rose-950/30 border-violet-200 dark:border-violet-800/50">
                <CardContent className="p-4 text-center">
                  <Eye className="h-6 w-6 text-violet-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-violet-700 dark:text-violet-400 line-clamp-2">
                    {stats.mostUsed ? stats.mostUsed.title : '—'}
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400">{t('comments.stat_most_used')}</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bar chart */}
          {stats.byCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('comments.chart_by_category')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.byCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <RTooltip />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {stats.byCategory.map((entry, index) => (
                          <Bar key={index} dataKey="count" fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 5 most-used */}
          {stats.topUsed.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('comments.top_used_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topUsed.map((entry, i) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/80 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg font-bold text-emerald-600 shrink-0">#{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{entry.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{entry.text.slice(0, 60)}…</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            backgroundColor: hexToRgba(entry.category.color, 0.15),
                            color: entry.category.color,
                            borderColor: hexToRgba(entry.category.color, 0.3),
                          }}
                        >
                          {entry.category.icon ? renderCBIcon(entry.category.icon) : null}{entry.category.name}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-semibold">
                          {entry.usageCount}×
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => copyEntryText(entry.text)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Entry Create/Edit Dialog ──────────────────────────────────── */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {entryForm.id ? t('comments.edit_entry') : t('comments.create_entry')}
            </DialogTitle>
            <DialogDescription>
              {entryForm.id ? t('comments.edit_entry_desc') : t('comments.create_entry_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('comments.field_title')}</Label>
              <Input
                value={entryForm.title}
                onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                placeholder={t('comments.title_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('comments.field_category')}</Label>
              <Select
                value={entryForm.categoryId}
                onValueChange={(v) => setEntryForm({ ...entryForm, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon ? `${c.icon} ` : ''}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('comments.field_subject')}</Label>
              <Select
                value={entryForm.subjectId}
                onValueChange={(v) => setEntryForm({ ...entryForm, subjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('comments.no_subject')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('comments.field_grade_level')}</Label>
              <Select
                value={entryForm.gradeLevel}
                onValueChange={(v) => setEntryForm({ ...entryForm, gradeLevel: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVEL_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g === 'all' ? t('comments.all_grades') : `Klasse ${g}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('comments.field_text')}</Label>
              <Textarea
                value={entryForm.text}
                onChange={(e) => setEntryForm({ ...entryForm, text: e.target.value })}
                placeholder={t('comments.text_placeholder')}
                rows={6}
                className="min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-3">
              <Label>{t('comments.field_public')}</Label>
              <Switch
                checked={entryForm.isPublic}
                onCheckedChange={(v) => setEntryForm({ ...entryForm, isPublic: v })}
              />
              <span className="text-sm text-muted-foreground">
                {entryForm.isPublic ? t('comments.public') : t('comments.private')}
              </span>
            </div>

            <div className="space-y-2">
              <Label>{t('comments.field_tags')}</Label>
              <Input
                value={entryForm.tags}
                onChange={(e) => setEntryForm({ ...entryForm, tags: e.target.value })}
                placeholder={t('comments.tags_placeholder')}
              />
            </div>

            {/* Preview */}
            {entryForm.text && (
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('comments.preview')}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm">{entryForm.text}</p>
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              onClick={saveEntry}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Entry Detail Dialog ────────────────────────────────────── */}
      <Dialog open={entryDetailOpen} onOpenChange={setEntryDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {entryDetailData && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {entryDetailData.title}
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      backgroundColor: hexToRgba(entryDetailData.category.color, 0.15),
                      color: entryDetailData.category.color,
                      borderColor: hexToRgba(entryDetailData.category.color, 0.3),
                    }}
                  >
                    {entryDetailData.category.icon ? renderCBIcon(entryDetailData.category.icon) : null}{entryDetailData.category.name}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {entryDetailData.teacher.firstName} {entryDetailData.teacher.lastName}
                  {entryDetailData.subject && ` · ${entryDetailData.subject.name}`}
                  {entryDetailData.gradeLevel && ` · Klasse ${entryDetailData.gradeLevel}`}
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{entryDetailData.text}</p>
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyEntryText(entryDetailData.text)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {t('comments.copy_text')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEntryDetailOpen(false);
                    openEntryDialog(entryDetailData);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('action.edit')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Category Create/Edit Dialog ─────────────────────────────── */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {categoryForm.id ? t('comments.edit_category') : t('comments.add_category')}
            </DialogTitle>
            <DialogDescription>
              {categoryForm.id ? t('comments.edit_category_desc') : t('comments.add_category_desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('comments.category_name')}</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder={t('comments.category_name_placeholder')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('comments.category_color')}</Label>
              <div className="flex gap-2 items-center">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-all ${
                      categoryForm.color === c ? 'scale-110 ring-2 ring-offset-2' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c, borderColor: categoryForm.color === c ? c : 'transparent' }}
                    onClick={() => setCategoryForm({ ...categoryForm, color: c })}
                  />
                ))}
                <Input
                  value={categoryForm.color}
                  onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  className="w-[100px] ml-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('comments.category_icon')}</Label>
              <Input
                value={categoryForm.icon}
                onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                placeholder={t('comments.category_icon_placeholder')}
                className="w-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              onClick={saveCategory}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Entry Alert ─────────────────────────────────────── */}
      <AlertDialog open={deleteEntryOpen} onOpenChange={setDeleteEntryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('comments.delete_entry_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('comments.delete_entry_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntry}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Category Alert ──────────────────────────────────── */}
      <AlertDialog open={deleteCategoryOpen} onOpenChange={setDeleteCategoryOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('comments.delete_category_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('comments.delete_category_desc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
