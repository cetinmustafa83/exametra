'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ruler,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Search,
  Filter,
  Loader2,
  Eye,
  Printer,
  Lock,
  Globe,
  ChevronDown,
  ChevronUp,
  X,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
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
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchRubrics,
  createRubric,
  updateRubric,
  deleteRubric,
  duplicateRubric,
  fetchSubjects,
  type Rubric,
  type RubricCriterion,
  type RubricLevel,
  type RubricCriterionInput,
  type RubricLevelInput,
  type Subject,
} from '@/lib/api';
import { toast } from 'sonner';

/* ── Helpers ─────────────────────────────────────────────────────── */

interface CriterionDraft {
  id?: string;
  name: string;
  description: string;
  weight: number;
  maxPoints: number;
  order: number;
  levels: LevelDraft[];
}

interface LevelDraft {
  id?: string;
  label: string;
  description: string;
  points: number;
  order: number;
}

function emptyCriterion(order: number): CriterionDraft {
  return {
    name: '',
    description: '',
    weight: 1.0,
    maxPoints: 25,
    order,
    levels: [
      { label: '', description: '', points: 25, order: 0 },
      { label: '', description: '', points: 19, order: 1 },
      { label: '', description: '', points: 12, order: 2 },
      { label: '', description: '', points: 6, order: 3 },
    ],
  };
}

function rubricToDraft(r: Rubric): {
  title: string;
  description: string;
  type: 'ANALYTIC' | 'HOLISTIC';
  subjectId: string;
  maxPoints: number;
  isPublic: boolean;
  criteria: CriterionDraft[];
} {
  return {
    title: r.title,
    description: r.description ?? '',
    type: r.type as 'ANALYTIC' | 'HOLISTIC',
    subjectId: r.subjectId ?? '',
    maxPoints: r.maxPoints,
    isPublic: r.isPublic,
    criteria: r.criteria.map((c, ci) => ({
      id: c.id,
      name: c.name,
      description: c.description ?? '',
      weight: c.weight,
      maxPoints: c.maxPoints,
      order: ci,
      levels: c.levels.map((l, li) => ({
        id: l.id,
        label: l.label,
        description: l.description,
        points: l.points,
        order: li,
      })),
    })),
  };
}

const LEVEL_COLORS = ['bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300', 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300', 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'];

const LEVEL_HEADER_COLORS = ['bg-emerald-500', 'bg-teal-500', 'bg-amber-500', 'bg-rose-500'];

/* ── Main Component ──────────────────────────────────────────────── */

export default function RubricLibraryView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolId = currentUser?.schoolId;

  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [showMyOnly, setShowMyOnly] = useState(false);

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRubric, setDetailRubric] = useState<Rubric | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRubric, setDeletingRubric] = useState<Rubric | null>(null);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState('edit');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<'ANALYTIC' | 'HOLISTIC'>('ANALYTIC');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formMaxPoints, setFormMaxPoints] = useState(100);
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [formCriteria, setFormCriteria] = useState<CriterionDraft[]>([emptyCriterion(0)]);

  const loadRubrics = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const data = await fetchRubrics(schoolId);
      setRubrics(data);
    } catch {
      toast.error(t('rubrics.error'));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const loadSubjects = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await fetchSubjects(schoolId);
      setSubjects(data);
    } catch {
      // silent
    }
  }, [schoolId]);

  useEffect(() => {
    loadRubrics();
    loadSubjects();
  }, [loadRubrics, loadSubjects]);

  // Filtered rubrics
  const filtered = useMemo(() => {
    let result = rubrics;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q)
      );
    }
    if (subjectFilter && subjectFilter !== 'all') {
      result = result.filter((r) => r.subjectId === subjectFilter);
    }
    if (showMyOnly && currentUser) {
      result = result.filter((r) => r.teacherId === currentUser.id);
    }
    return result;
  }, [rubrics, searchQuery, subjectFilter, showMyOnly, currentUser]);

  /* ── Form helpers ─────────────────────────────────────────────── */

  const openCreateForm = () => {
    setEditingRubric(null);
    setFormTitle('');
    setFormDescription('');
    setFormType('ANALYTIC');
    setFormSubjectId('');
    setFormMaxPoints(100);
    setFormIsPublic(false);
    setFormCriteria([emptyCriterion(0)]);
    setFormTab('edit');
    setFormOpen(true);
  };

  const openEditForm = (r: Rubric) => {
    const draft = rubricToDraft(r);
    setEditingRubric(r);
    setFormTitle(draft.title);
    setFormDescription(draft.description);
    setFormType(draft.type);
    setFormSubjectId(draft.subjectId);
    setFormMaxPoints(draft.maxPoints);
    setFormIsPublic(draft.isPublic);
    setFormCriteria(draft.criteria);
    setFormTab('edit');
    setFormOpen(true);
  };

  const addCriterion = () => {
    setFormCriteria((prev) => [...prev, emptyCriterion(prev.length)]);
  };

  const removeCriterion = (idx: number) => {
    setFormCriteria((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })));
  };

  const updateCriterion = (idx: number, field: keyof CriterionDraft, value: unknown) => {
    setFormCriteria((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  const addLevel = (cIdx: number) => {
    setFormCriteria((prev) =>
      prev.map((c, i) =>
        i === cIdx
          ? { ...c, levels: [...c.levels, { label: '', description: '', points: 0, order: c.levels.length }] }
          : c
      )
    );
  };

  const removeLevel = (cIdx: number, lIdx: number) => {
    setFormCriteria((prev) =>
      prev.map((c, i) =>
        i === cIdx
          ? { ...c, levels: c.levels.filter((_, li) => li !== lIdx).map((l, li) => ({ ...l, order: li })) }
          : c
      )
    );
  };

  const updateLevel = (cIdx: number, lIdx: number, field: keyof LevelDraft, value: unknown) => {
    setFormCriteria((prev) =>
      prev.map((c, i) =>
        i === cIdx
          ? {
              ...c,
              levels: c.levels.map((l, li) => (li === lIdx ? { ...l, [field]: value } : l)),
            }
          : c
      )
    );
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error(t('rubrics.title_required'));
      return;
    }
    if (formCriteria.length === 0) {
      toast.error(t('rubrics.criteria_required'));
      return;
    }
    for (const c of formCriteria) {
      if (c.levels.length === 0) {
        toast.error(t('rubrics.levels_required'));
        return;
      }
    }

    const criteriaPayload: RubricCriterionInput[] = formCriteria.map((c, ci) => ({
      id: c.id,
      name: c.name,
      description: c.description || null,
      weight: c.weight,
      maxPoints: c.maxPoints,
      order: ci,
      levels: c.levels.map((l, li) => ({
        id: l.id,
        label: l.label,
        description: l.description,
        points: l.points,
        order: li,
      })),
    }));

    try {
      setSaving(true);
      if (editingRubric) {
        await updateRubric(editingRubric.id, {
          title: formTitle,
          description: formDescription || null,
          type: formType,
          subjectId: formSubjectId || null,
          maxPoints: formMaxPoints,
          isPublic: formIsPublic,
          criteria: criteriaPayload,
        });
      } else {
        if (!schoolId) return;
        await createRubric({
          schoolId,
          title: formTitle,
          description: formDescription || null,
          type: formType,
          subjectId: formSubjectId || null,
          maxPoints: formMaxPoints,
          isPublic: formIsPublic,
          criteria: criteriaPayload,
        });
      }
      toast.success(t('rubrics.saved'));
      setFormOpen(false);
      loadRubrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRubric) return;
    try {
      await deleteRubric(deletingRubric.id);
      toast.success(t('rubrics.deleted'));
      setDeleteOpen(false);
      setDeletingRubric(null);
      loadRubrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    }
  };

  const handleDuplicate = async (r: Rubric) => {
    try {
      await duplicateRubric(r.id);
      toast.success(t('rubrics.duplicated'));
      loadRubrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    }
  };

  const openDetail = (r: Rubric) => {
    setDetailRubric(r);
    setDetailOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  /* ── Render ───────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Ruler className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t('rubrics.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('rubrics.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('rubrics.create')}
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('rubrics.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('rubrics.filter_subject')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('rubrics.all_subjects')}</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showMyOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMyOnly(!showMyOnly)}
          className={showMyOnly ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
        >
          <Filter className="h-4 w-4 mr-1" />
          {showMyOnly ? t('rubrics.filter_public') : t('rubrics.filter_all')}
        </Button>
      </motion.div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
            <Ruler className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t('rubrics.empty_title')}</h3>
          <p className="text-muted-foreground max-w-md mb-6">{t('rubrics.empty_desc')}</p>
          <Button
            onClick={openCreateForm}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('rubrics.empty_create')}
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((rubric, idx) => (
              <motion.div
                key={rubric.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: idx * 0.05 }}
                layout
              >
                <Card
                  className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-emerald-500 group"
                  onClick={() => openDetail(rubric)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">
                          {rubric.title}
                        </CardTitle>
                        {rubric.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {rubric.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge
                          className={
                            rubric.type === 'ANALYTIC'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                          }
                        >
                          {rubric.type === 'ANALYTIC'
                            ? t('rubrics.type_analytic')
                            : t('rubrics.type_holistic')}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rubric.subject && (
                        <Badge variant="outline" className="text-xs">
                          {rubric.subject.name}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {t('rubrics.criteria_count', { count: rubric.criteria.length })}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rubric.maxPoints} {t('rubrics.points')}
                      </Badge>
                      <Badge
                        className={
                          rubric.isPublic
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }
                      >
                        {rubric.isPublic ? (
                          <Globe className="h-3 w-3 mr-1" />
                        ) : (
                          <Lock className="h-3 w-3 mr-1" />
                        )}
                        {rubric.isPublic ? t('rubrics.public') : t('rubrics.private')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {t('rubrics.by_teacher')}{' '}
                        {rubric.teacher
                          ? `${rubric.teacher.firstName} ${rubric.teacher.lastName}`
                          : ''}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditForm(rubric);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(rubric);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingRubric(rubric);
                            setDeleteOpen(true);
                          }}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Create/Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        if (!open && saving) return;
        setFormOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRubric ? t('rubrics.edit') : t('rubrics.create')}
            </DialogTitle>
            <DialogDescription>
              {t('rubrics.subtitle')}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList className="w-full">
              <TabsTrigger value="edit" className="flex-1">
                {t('rubrics.edit_form')}
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                {t('rubrics.preview')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="space-y-4 mt-4">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('rubrics.field.title')}</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={t('rubrics.field.title')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('rubrics.field.type')}</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v as 'ANALYTIC' | 'HOLISTIC')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANALYTIC">{t('rubrics.type_analytic')}</SelectItem>
                      <SelectItem value="HOLISTIC">{t('rubrics.type_holistic')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('rubrics.field.subject')}</Label>
                  <Select value={formSubjectId || '__none__'} onValueChange={(v) => setFormSubjectId(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t('rubrics.no_subject')}</SelectItem>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('rubrics.field.max_points')}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formMaxPoints}
                    onChange={(e) => setFormMaxPoints(parseInt(e.target.value) || 100)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('rubrics.field.description')}</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={t('rubrics.field.description')}
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formIsPublic}
                  onCheckedChange={setFormIsPublic}
                />
                <div>
                  <Label>{t('rubrics.field.is_public')}</Label>
                  <p className="text-xs text-muted-foreground">{t('rubrics.field.is_public_hint')}</p>
                </div>
              </div>

              <Separator />

              {/* Criteria */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{t('rubrics.criteria')}</h3>
                  <Button variant="outline" size="sm" onClick={addCriterion}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t('rubrics.add_criterion')}
                  </Button>
                </div>

                {formCriteria.map((criterion, cIdx) => (
                  <Card key={cIdx} className="border-l-4 border-l-teal-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {t('rubrics.criterion')} {cIdx + 1}
                          </span>
                        </div>
                        {formCriteria.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCriterion(cIdx)}
                            className="text-rose-500 hover:text-rose-700 h-7 px-2"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            {t('rubrics.remove_criterion')}
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">{t('rubrics.criterion_name')}</Label>
                          <Input
                            value={criterion.name}
                            onChange={(e) => updateCriterion(cIdx, 'name', e.target.value)}
                            placeholder={t('rubrics.criterion_name')}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('rubrics.criterion_weight')}</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            value={criterion.weight}
                            onChange={(e) => updateCriterion(cIdx, 'weight', parseFloat(e.target.value) || 1)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">{t('rubrics.criterion_max_points')}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={criterion.maxPoints}
                            onChange={(e) => updateCriterion(cIdx, 'maxPoints', parseInt(e.target.value) || 25)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('rubrics.criterion_description')}</Label>
                        <Input
                          value={criterion.description}
                          onChange={(e) => updateCriterion(cIdx, 'description', e.target.value)}
                          placeholder={t('rubrics.criterion_description')}
                        />
                      </div>

                      {/* Levels */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">{t('rubrics.levels')}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addLevel(cIdx)}
                            className="h-6 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('rubrics.add_level')}
                          </Button>
                        </div>
                        {criterion.levels.map((level, lIdx) => (
                          <div
                            key={lIdx}
                            className={`rounded-lg p-3 ${LEVEL_COLORS[lIdx % LEVEL_COLORS.length]}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium">
                                {t('rubrics.level')} {lIdx + 1}
                              </span>
                              {criterion.levels.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLevel(cIdx, lIdx)}
                                  className="h-5 w-5 p-0 ml-auto"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">{t('rubrics.level_label')}</Label>
                                <Input
                                  value={level.label}
                                  onChange={(e) => updateLevel(cIdx, lIdx, 'label', e.target.value)}
                                  placeholder={t('rubrics.level_label')}
                                  className="bg-white/70 dark:bg-black/20"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t('rubrics.level_points')}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={level.points}
                                  onChange={(e) => updateLevel(cIdx, lIdx, 'points', parseInt(e.target.value) || 0)}
                                  className="bg-white/70 dark:bg-black/20"
                                />
                              </div>
                              <div className="space-y-1 sm:col-span-1">
                                <Label className="text-xs">{t('rubrics.level_description')}</Label>
                                <Input
                                  value={level.description}
                                  onChange={(e) => updateLevel(cIdx, lIdx, 'description', e.target.value)}
                                  placeholder={t('rubrics.level_description')}
                                  className="bg-white/70 dark:bg-black/20"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <RubricPreviewTable
                title={formTitle}
                criteria={formCriteria}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              {t('rubrics.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('rubrics.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ──────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailRubric && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl">{detailRubric.title}</DialogTitle>
                    <DialogDescription>
                      {detailRubric.description}
                    </DialogDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1" />
                    {t('rubrics.print')}
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge
                  className={
                    detailRubric.type === 'ANALYTIC'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                  }
                >
                  {detailRubric.type === 'ANALYTIC'
                    ? t('rubrics.type_analytic')
                    : t('rubrics.type_holistic')}
                </Badge>
                {detailRubric.subject && (
                  <Badge variant="outline">{detailRubric.subject.name}</Badge>
                )}
                <Badge variant="outline">
                  {detailRubric.maxPoints} {t('rubrics.points')}
                </Badge>
                <Badge
                  className={
                    detailRubric.isPublic
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }
                >
                  {detailRubric.isPublic ? t('rubrics.public') : t('rubrics.private')}
                </Badge>
                <Badge variant="outline">
                  {t('rubrics.version')} {detailRubric.version}
                </Badge>
              </div>

              <RubricPreviewTable
                title={detailRubric.title}
                criteria={detailRubric.criteria.map((c, ci) => ({
                  name: c.name,
                  description: c.description ?? '',
                  weight: c.weight,
                  maxPoints: c.maxPoints,
                  order: ci,
                  levels: c.levels.map((l, li) => ({
                    label: l.label,
                    description: l.description,
                    points: l.points,
                    order: li,
                  })),
                }))}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rubrics.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('rubrics.delete_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('rubrics.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {t('rubrics.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ── Preview Table Component ─────────────────────────────────────── */

function RubricPreviewTable({
  title,
  criteria,
}: {
  title: string;
  criteria: CriterionDraft[] | RubricCriterion[];
}) {
  // Determine max levels across all criteria
  const maxLevels = criteria.reduce((max, c) => {
    const levels = 'levels' in c ? c.levels : [];
    return Math.max(max, levels.length);
  }, 0);

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const totalPoints = criteria.reduce((sum, c) => sum + c.maxPoints, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900">
              <th className="text-left p-3 font-medium border-b min-w-[120px]">
                {t('rubrics.table_criterion')}
              </th>
              <th className="text-center p-3 font-medium border-b w-16">
                {t('rubrics.table_weight_short')}
              </th>
              {Array.from({ length: maxLevels }).map((_, li) => (
                <th
                  key={li}
                  className={`text-center p-3 font-medium border-b min-w-[140px] ${LEVEL_HEADER_COLORS[li % LEVEL_HEADER_COLORS.length]} text-white`}
                >
                  {t('rubrics.level_header', { order: li + 1 })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((c, ci) => {
              const levels = 'levels' in c ? c.levels : [];
              return (
                <tr key={ci} className="border-b last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="p-3">
                    <div className="font-medium">{c.name}</div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">{c.description}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {c.maxPoints} {t('rubrics.points')}
                    </div>
                  </td>
                  <td className="text-center p-3 font-medium">{c.weight}</td>
                  {Array.from({ length: maxLevels }).map((_, li) => {
                    const level = levels[li];
                    return (
                      <td key={li} className="p-3 text-center">
                        {level ? (
                          <div>
                            <div className="font-medium text-xs">{level.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-3">
                              {level.description}
                            </div>
                            <Badge
                              variant="outline"
                              className={`mt-1 text-xs ${LEVEL_COLORS[li % LEVEL_COLORS.length]}`}
                            >
                              {level.points} {t('rubrics.points')}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 dark:bg-slate-900 font-medium">
              <td className="p-3">{t('rubrics.total_weight')}</td>
              <td className="text-center p-3">{totalWeight}</td>
              <td colSpan={maxLevels} className="p-3 text-xs text-muted-foreground">
                {t('rubrics.total_points')}: {totalPoints}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
