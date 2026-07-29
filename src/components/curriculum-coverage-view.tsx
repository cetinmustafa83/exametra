'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Link2,
  Unlink,
  AlertTriangle,
  CheckCircle2,
  Shield,
  BookOpen,
  Grid3X3,
  ChevronDown,
  ChevronRight,
  X,
  BarChart3,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  fetchCurriculumStandards,
  createCurriculumStandard,
  updateCurriculumStandard,
  deleteCurriculumStandard,
  linkCurriculumStandard,
  unlinkCurriculumStandard,
  fetchSubjects,
  fetchCompetencyTemplates,
  fetchClassCompetencyAssignments,
  type CurriculumStandard,
  type CurriculumStandardLink,
  type Subject,
  type CompetencyTemplate,
} from '@/lib/api';
import { toast } from 'sonner';

/* ── Coverage level colors ── */
const COVERAGE_COLORS: Record<string, string> = {
  full: 'bg-emerald-500',
  partial: 'bg-amber-500',
  related: 'bg-teal-500',
};
const COVERAGE_BG: Record<string, string> = {
  full: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  related: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
};
const COVERAGE_LABELS: Record<string, string> = {
  full: 'curriculum.coverage_full',
  partial: 'curriculum.coverage_partial',
  related: 'curriculum.coverage_related',
};

/* ── Main Component ──────────────────────────────────────────────── */

export default function CurriculumCoverageView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolId = currentUser?.schoolId;

  const [standards, setStandards] = useState<CurriculumStandard[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editingStandard, setEditingStandard] = useState<CurriculumStandard | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingStandard, setDeletingStandard] = useState<CurriculumStandard | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkingStandard, setLinkingStandard] = useState<CurriculumStandard | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStandard, setDetailStandard] = useState<CurriculumStandard | null>(null);

  // Link form
  const [availableCompetencies, setAvailableCompetencies] = useState<Array<{ id: string; code: string; title: string; categoryName: string; categoryColor: string | null }>>([]);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState('');
  const [selectedCoverageLevel, setSelectedCoverageLevel] = useState<'full' | 'partial' | 'related'>('full');
  const [linkNotes, setLinkNotes] = useState('');
  const [competencySearch, setCompetencySearch] = useState('');

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formGradeLevel, setFormGradeLevel] = useState<number | null>(null);
  const [formCategory, setFormCategory] = useState('');
  const [formSource, setFormSource] = useState('');

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const [standardsData, subjectsData] = await Promise.all([
        fetchCurriculumStandards(schoolId),
        fetchSubjects(schoolId),
      ]);
      setStandards(standardsData);
      setSubjects(subjectsData);
    } catch {
      toast.error(t('rubrics.error'));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered standards
  const filtered = useMemo(() => {
    let result = standards;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q)
      );
    }
    if (subjectFilter && subjectFilter !== 'all') {
      result = result.filter((s) => s.subjectId === subjectFilter);
    }
    if (gradeFilter && gradeFilter !== 'all') {
      result = result.filter((s) => s.gradeLevel === parseInt(gradeFilter));
    }
    return result;
  }, [standards, searchQuery, subjectFilter, gradeFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = standards.length;
    const linked = standards.filter((s) => s.competencyLinks.length > 0).length;
    const unlinked = total - linked;
    const coveragePercent = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { total, linked, unlinked, coveragePercent };
  }, [standards]);

  // Gap analysis: standards without any competency links
  const gaps = useMemo(() => {
    return standards.filter((s) => s.competencyLinks.length === 0);
  }, [standards]);

  // Heatmap data: group by subject and grade level
  const heatmapData = useMemo(() => {
    const map = new Map<string, { subject: string; gradeLevel: string; total: number; linked: number; coverage: number }>();
    for (const s of standards) {
      const key = `${s.subject?.name ?? 'No Subject'}-${s.gradeLevel ?? 'N/A'}`;
      const existing = map.get(key) || {
        subject: s.subject?.name ?? 'No Subject',
        gradeLevel: s.gradeLevel ? String(s.gradeLevel) : 'N/A',
        total: 0,
        linked: 0,
        coverage: 0,
      };
      existing.total++;
      if (s.competencyLinks.length > 0) existing.linked++;
      map.set(key, existing);
    }
    return Array.from(map.values()).map((d) => ({
      ...d,
      coverage: d.total > 0 ? Math.round((d.linked / d.total) * 100) : 0,
    }));
  }, [standards]);

  /* ── Form helpers ─────────────────────────────────────────────── */

  const openCreateForm = () => {
    setEditingStandard(null);
    setFormCode('');
    setFormTitle('');
    setFormDescription('');
    setFormSubjectId('');
    setFormGradeLevel(null);
    setFormCategory('');
    setFormSource('');
    setFormOpen(true);
  };

  const openEditForm = (s: CurriculumStandard) => {
    setEditingStandard(s);
    setFormCode(s.code);
    setFormTitle(s.title);
    setFormDescription(s.description ?? '');
    setFormSubjectId(s.subjectId ?? '');
    setFormGradeLevel(s.gradeLevel);
    setFormCategory(s.category ?? '');
    setFormSource(s.source ?? '');
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formCode.trim()) {
      toast.error(t('rubrics.title_required'));
      return;
    }
    try {
      setSaving(true);
      if (editingStandard) {
        await updateCurriculumStandard(editingStandard.id, {
          code: formCode,
          title: formTitle,
          description: formDescription || null,
          subjectId: formSubjectId || null,
          gradeLevel: formGradeLevel,
          category: formCategory || null,
          source: formSource || null,
        });
      } else {
        if (!schoolId) return;
        await createCurriculumStandard({
          schoolId,
          code: formCode,
          title: formTitle,
          description: formDescription || null,
          subjectId: formSubjectId || null,
          gradeLevel: formGradeLevel,
          category: formCategory || null,
          source: formSource || null,
        });
      }
      toast.success(t('rubrics.saved'));
      setFormOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStandard) return;
    try {
      await deleteCurriculumStandard(deletingStandard.id);
      toast.success(t('rubrics.deleted'));
      setDeleteOpen(false);
      setDeletingStandard(null);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    }
  };

  const openLinkDialog = async (standard: CurriculumStandard) => {
    setLinkingStandard(standard);
    setSelectedCompetencyId('');
    setSelectedCoverageLevel('full');
    setLinkNotes('');
    setCompetencySearch('');
    setLinkOpen(true);

    // Load available competencies
    try {
      if (!schoolId) return;
      const templates = await fetchCompetencyTemplates({ schoolId });
      const comps: Array<{ id: string; code: string; title: string; categoryName: string; categoryColor: string | null }> = [];
      for (const tmpl of templates) {
        for (const cat of tmpl.categories) {
          for (const comp of cat.competencies) {
            comps.push({
              id: comp.id,
              code: comp.code,
              title: comp.title,
              categoryName: cat.name,
              categoryColor: cat.color,
            });
          }
        }
      }
      setAvailableCompetencies(comps);
    } catch {
      // silent
    }
  };

  const handleLink = async () => {
    if (!linkingStandard || !selectedCompetencyId) return;
    try {
      await linkCurriculumStandard(linkingStandard.id, {
        competencyId: selectedCompetencyId,
        coverageLevel: selectedCoverageLevel,
        notes: linkNotes || null,
      });
      toast.success(t('curriculum.link_competency'));
      setLinkOpen(false);
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    }
  };

  const handleUnlink = async (standardId: string, competencyId: string) => {
    try {
      await unlinkCurriculumStandard(standardId, competencyId);
      toast.success(t('curriculum.unlink_competency'));
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('rubrics.error'));
    }
  };

  const openDetail = (s: CurriculumStandard) => {
    setDetailStandard(s);
    setDetailOpen(true);
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
            <Map className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t('curriculum.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('curriculum.subtitle')}</p>
          </div>
        </div>
        <Button
          onClick={openCreateForm}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('curriculum.create_standard')}
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-muted-foreground">{t('curriculum.standards_count')}</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-teal-200 dark:border-teal-800 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-4 w-4 text-teal-500" />
              <span className="text-xs font-medium text-muted-foreground">{t('curriculum.linked_count')}</span>
            </div>
            <div className="text-2xl font-bold text-teal-600">{stats.linked}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-amber-200 dark:border-amber-800 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">{t('curriculum.unlinked_count')}</span>
            </div>
            <div className="text-2xl font-bold text-amber-600">{stats.unlinked}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-rose-200 dark:border-rose-800 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-medium text-muted-foreground">{t('curriculum.coverage_percent')}</span>
            </div>
            <div className="text-2xl font-bold text-rose-600">{stats.coveragePercent}%</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('curriculum.search_standards')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('curriculum.all_subjects')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('curriculum.all_subjects')}</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={gradeFilter} onValueChange={setGradeFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder={t('curriculum.all_grades')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('curriculum.all_grades')}</SelectItem>
            {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
              <SelectItem key={g} value={String(g)}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="standards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="standards">
            <BookOpen className="h-4 w-4 mr-1" />
            {t('curriculum.standards')}
          </TabsTrigger>
          <TabsTrigger value="heatmap">
            <Grid3X3 className="h-4 w-4 mr-1" />
            {t('curriculum.heatmap')}
          </TabsTrigger>
          <TabsTrigger value="gaps">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {t('curriculum.gap_analysis')}
          </TabsTrigger>
        </TabsList>

        {/* Standards Tab */}
        <TabsContent value="standards">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="h-16 w-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Map className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t('curriculum.empty_title')}</h3>
              <p className="text-muted-foreground max-w-md mb-6">{t('curriculum.empty_desc')}</p>
              <Button onClick={openCreateForm} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                {t('curriculum.create_standard')}
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((standard, idx) => (
                  <motion.div
                    key={standard.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: idx * 0.03 }}
                    layout
                  >
                    <Card
                      className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 group"
                      style={{
                        borderLeftColor: standard.competencyLinks.length > 0
                          ? '#10b981'
                          : '#f59e0b',
                      }}
                      onClick={() => openDetail(standard)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs font-mono">
                                {standard.code}
                              </Badge>
                              <span className="font-semibold text-sm">{standard.title}</span>
                            </div>
                            {standard.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{standard.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {standard.subject && (
                                <Badge variant="outline" className="text-xs">{standard.subject.name}</Badge>
                              )}
                              {standard.gradeLevel && (
                                <Badge variant="outline" className="text-xs">Kl. {standard.gradeLevel}</Badge>
                              )}
                              {standard.category && (
                                <Badge variant="outline" className="text-xs">{standard.category}</Badge>
                              )}
                              {standard.source && (
                                <Badge variant="outline" className="text-xs">{standard.source}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              className={
                                standard.competencyLinks.length > 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              }
                            >
                              {standard.competencyLinks.length > 0
                                ? `${standard.competencyLinks.length} ${t('curriculum.linked_competencies')}`
                                : t('curriculum.no_links')}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLinkDialog(standard);
                                }}
                                className="h-8 w-8 p-0"
                                title={t('curriculum.link_competency')}
                              >
                                <Link2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditForm(standard);
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
                                  setDeletingStandard(standard);
                                  setDeleteOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Heatmap Tab */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-emerald-500" />
                {t('curriculum.coverage_visualization')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('curriculum.empty_title')}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    {/* Header row */}
                    <div className="grid grid-cols-[200px_1fr_80px] gap-2 mb-2">
                      <div className="text-xs font-medium text-muted-foreground">{t('curriculum.subject')} / {t('curriculum.grade_level')}</div>
                      <div className="text-xs font-medium text-muted-foreground">{t('curriculum.coverage')}</div>
                      <div className="text-xs font-medium text-muted-foreground text-right">{t('curriculum.coverage_percent')}</div>
                    </div>
                    {heatmapData.map((row, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[200px_1fr_80px] gap-2 mb-2 items-center"
                      >
                        <div className="text-sm font-medium truncate">
                          {row.subject} — {row.gradeLevel}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                row.coverage >= 80 ? 'bg-emerald-500' :
                                row.coverage >= 50 ? 'bg-amber-500' :
                                row.coverage > 0 ? 'bg-rose-500' : 'bg-gray-300 dark:bg-gray-700'
                              }`}
                              style={{ width: `${Math.max(row.coverage, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{row.linked}/{row.total}</span>
                        </div>
                        <div className="text-sm font-medium text-right">
                          {row.coverage}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span>{'> 80%'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-amber-500" />
                  <span>50-80%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-sm bg-rose-500" />
                  <span>{'< 50%'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gap Analysis Tab */}
        <TabsContent value="gaps">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t('curriculum.gap_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gaps.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">{t('curriculum.no_gaps')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {gaps.map((standard) => (
                    <div
                      key={standard.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-xs font-mono">{standard.code}</Badge>
                          <span className="font-medium text-sm">{standard.title}</span>
                        </div>
                        <div className="flex gap-1.5">
                          {standard.subject && (
                            <Badge variant="outline" className="text-xs">{standard.subject.name}</Badge>
                          )}
                          {standard.gradeLevel && (
                            <Badge variant="outline" className="text-xs">Kl. {standard.gradeLevel}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLinkDialog(standard)}
                        className="shrink-0"
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" />
                        {t('curriculum.link_competency')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create/Edit Dialog ─────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={(open) => {
        if (!open && saving) return;
        setFormOpen(open);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStandard ? t('curriculum.edit_standard') : t('curriculum.create_standard')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('curriculum.code')}</Label>
                <Input
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="M.1.1"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('curriculum.standard_title')}</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t('curriculum.standard_title')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('curriculum.description')}</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('curriculum.description')}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('curriculum.subject')}</Label>
                <Select value={formSubjectId || '__none__'} onValueChange={(v) => setFormSubjectId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('rubrics.no_subject')}</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('curriculum.grade_level')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={13}
                  value={formGradeLevel ?? ''}
                  onChange={(e) => setFormGradeLevel(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="1-13"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('curriculum.category')}</Label>
                <Input
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Zahlen, Algebra, Geometrie..."
                />
              </div>
              <div className="space-y-2">
                <Label>{t('curriculum.source')}</Label>
                <Input
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="KMK, Lehrplan NRW..."
                />
              </div>
            </div>
          </div>

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

      {/* ── Link Competency Dialog ─────────────────────────────────── */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-emerald-500" />
              {t('curriculum.link_competency')}
            </DialogTitle>
            <DialogDescription>
              {linkingStandard?.code} — {linkingStandard?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Existing Links */}
            {linkingStandard && linkingStandard.competencyLinks.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('curriculum.linked_competencies')}</Label>
                {linkingStandard.competencyLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-2 rounded-lg border"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">{link.competency.code}</Badge>
                      <span className="text-sm">{link.competency.title}</span>
                      {link.coverageLevel && (
                        <Badge className={COVERAGE_BG[link.coverageLevel] ?? ''}>
                          {t(COVERAGE_LABELS[link.coverageLevel] ?? link.coverageLevel)}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(linkingStandard.id, link.competencyId)}
                      className="h-7 px-2 text-rose-500 hover:text-rose-700"
                    >
                      <Unlink className="h-3.5 w-3.5 mr-1" />
                      {t('curriculum.unlink_competency')}
                    </Button>
                  </div>
                ))}
                <Separator />
              </div>
            )}

            {/* Add new link */}
            <div className="space-y-3">
              <Label>{t('curriculum.select_competency')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('curriculum.search_competency')}
                  value={competencySearch}
                  onChange={(e) => setCompetencySearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {availableCompetencies
                  .filter((c) => {
                    if (!competencySearch) return true;
                    const q = competencySearch.toLowerCase();
                    return c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q);
                  })
                  .filter((c) => {
                    // Don't show already linked competencies
                    if (!linkingStandard) return true;
                    return !linkingStandard.competencyLinks.some((l) => l.competencyId === c.id);
                  })
                  .slice(0, 50)
                  .map((comp) => (
                    <motion.button
                      key={comp.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedCompetencyId(comp.id)}
                      className={`w-full text-left p-2.5 border-b last:border-b-0 transition-colors ${
                        selectedCompetencyId === comp.id
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-l-emerald-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">{comp.code}</Badge>
                        <span className="text-sm">{comp.title}</span>
                        {comp.categoryName && (
                          <span className="text-xs text-muted-foreground ml-auto">{comp.categoryName}</span>
                        )}
                      </div>
                    </motion.button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('curriculum.coverage_level')}</Label>
                <Select value={selectedCoverageLevel} onValueChange={(v) => setSelectedCoverageLevel(v as 'full' | 'partial' | 'related')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">{t('curriculum.coverage_full')}</SelectItem>
                    <SelectItem value="partial">{t('curriculum.coverage_partial')}</SelectItem>
                    <SelectItem value="related">{t('curriculum.coverage_related')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('curriculum.notes')}</Label>
                <Input
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  placeholder={t('curriculum.notes')}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              {t('rubrics.cancel')}
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedCompetencyId}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              <Link2 className="h-4 w-4 mr-2" />
              {t('curriculum.link_competency')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ──────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailStandard && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-xl flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{detailStandard.code}</Badge>
                      {detailStandard.title}
                    </DialogTitle>
                    <DialogDescription>{detailStandard.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 mb-4">
                {detailStandard.subject && (
                  <Badge variant="outline">{detailStandard.subject.name}</Badge>
                )}
                {detailStandard.gradeLevel && (
                  <Badge variant="outline">Kl. {detailStandard.gradeLevel}</Badge>
                )}
                {detailStandard.category && (
                  <Badge variant="outline">{detailStandard.category}</Badge>
                )}
                {detailStandard.source && (
                  <Badge variant="outline">{detailStandard.source}</Badge>
                )}
              </div>

              <Separator />

              {/* Linked Competencies */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t('curriculum.linked_competencies')}</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDetailOpen(false);
                      setTimeout(() => openLinkDialog(detailStandard), 200);
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5 mr-1" />
                    {t('curriculum.link_competency')}
                  </Button>
                </div>

                {detailStandard.competencyLinks.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                    <p className="text-sm">{t('curriculum.no_links')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailStandard.competencyLinks.map((link) => (
                      <div key={link.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-xs font-mono">{link.competency.code}</Badge>
                            <span className="text-sm font-medium">{link.competency.title}</span>
                          </div>
                          {link.competency.category && (
                            <span className="text-xs text-muted-foreground">{link.competency.category.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {link.coverageLevel && (
                            <Badge className={COVERAGE_BG[link.coverageLevel] ?? ''}>
                              {t(COVERAGE_LABELS[link.coverageLevel] ?? link.coverageLevel)}
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlink(detailStandard.id, link.competencyId)}
                            className="h-7 px-2 text-rose-500 hover:text-rose-700"
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('curriculum.delete_standard')}</AlertDialogTitle>
            <AlertDialogDescription>{t('curriculum.delete_standard_desc')}</AlertDialogDescription>
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
