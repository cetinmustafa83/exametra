'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, Trash2, Pencil, Eye, EyeOff, Search,
  Palette, BookOpen, FileText, Presentation, Award, Lightbulb,
  Grid3X3, List, Tag, Calendar, Filter, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────
interface PortfolioEntryData {
  id: string;
  schoolId: string;
  studentId: string;
  title: string;
  description: string | null;
  entryType: string;
  competencyId: string | null;
  content: string | null;
  mediaUrls: string | null;
  notebookPageId: string | null;
  drawingId: string | null;
  isPublic: boolean;
  tags: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  student: { id: string; firstName: string; lastName: string };
  competency: { id: string; code: string; title: string } | null;
}

const ENTRY_TYPES = [
  { value: 'artwork', labelKey: 'portfolio.artwork', icon: Palette, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  { value: 'writing', labelKey: 'portfolio.writing', icon: BookOpen, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'project', labelKey: 'portfolio.project', icon: Grid3X3, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  { value: 'presentation', labelKey: 'portfolio.presentation', icon: Presentation, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  { value: 'achievement', labelKey: 'portfolio.achievement', icon: Award, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
  { value: 'reflection', labelKey: 'portfolio.reflection', icon: Lightbulb, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
];

function getEntryTypeConfig(type: string) {
  return ENTRY_TYPES.find((et) => et.value === type) ?? ENTRY_TYPES[5];
}

export default function PortfolioView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentStudentId = useAppStore((s) => s.currentStudentId);

  const [entries, setEntries] = useState<PortfolioEntryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    entryType: 'reflection',
    competencyId: '',
    content: '',
    tags: '',
    isPublic: false,
  });

  const schoolId = currentUser?.schoolId;
  const studentId = currentStudentId ?? currentUser?.id ?? '';

  // Load entries
  useEffect(() => {
    if (!schoolId || !studentId) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiGet<PortfolioEntryData[]>(`/api/portfolio?schoolId=${schoolId}&studentId=${studentId}`);
        if (!cancelled) setEntries(data);
      } catch { /* ignore */ } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [schoolId, studentId]);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => {
      if (e.tags) {
        try {
          const parsed = JSON.parse(e.tags) as string[];
          parsed.forEach((tag) => tagSet.add(tag));
        } catch { /* ignore */ }
      }
    });
    return Array.from(tagSet).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterType !== 'all' && e.entryType !== filterType) return false;
      if (filterTag && e.tags) {
        try {
          const parsed = JSON.parse(e.tags) as string[];
          if (!parsed.includes(filterTag)) return false;
        } catch { return false; }
      }
      if (filterTag && !e.tags) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          (e.description ?? '').toLowerCase().includes(q) ||
          (e.content ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, filterType, filterTag, searchQuery]);

  // Open dialog for create
  const openCreate = () => {
    setEditId(null);
    setForm({ title: '', description: '', entryType: 'reflection', competencyId: '', content: '', tags: '', isPublic: false });
    setDialogOpen(true);
  };

  // Open dialog for edit
  const openEdit = (entry: PortfolioEntryData) => {
    setEditId(entry.id);
    let parsedTags = '';
    if (entry.tags) {
      try { parsedTags = (JSON.parse(entry.tags) as string[]).join(', '); } catch { /* ignore */ }
    }
    setForm({
      title: entry.title,
      description: entry.description ?? '',
      entryType: entry.entryType,
      competencyId: entry.competencyId ?? '',
      content: entry.content ?? '',
      tags: parsedTags,
      isPublic: entry.isPublic,
    });
    setDialogOpen(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!form.title) { toast.error(t('portfolio.entry_title')); return; }
    if (!form.entryType) { toast.error(t('portfolio.entry_type')); return; }
    try {
      const tagsArray = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const payload = {
        schoolId,
        studentId,
        title: form.title,
        description: form.description || null,
        entryType: form.entryType,
        competencyId: form.competencyId || null,
        content: form.content || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        isPublic: form.isPublic,
      };
      if (editId) {
        const updated = await apiPut<PortfolioEntryData>(`/api/portfolio/${editId}`, payload);
        setEntries((prev) => prev.map((e) => e.id === editId ? updated : e));
      } else {
        const created = await apiPost<PortfolioEntryData>('/api/portfolio', payload);
        setEntries((prev) => [created, ...prev]);
      }
      setDialogOpen(false);
      toast.success(editId ? t('action.save') : t('action.create'));
    } catch { toast.error(t('error.generic')); }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await apiDelete(`/api/portfolio/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success(t('action.delete'));
    } catch { toast.error(t('error.generic')); }
  };

  // Toggle public
  const togglePublic = async (entry: PortfolioEntryData) => {
    try {
      const updated = await apiPut<PortfolioEntryData>(`/api/portfolio/${entry.id}`, { isPublic: !entry.isPublic });
      setEntries((prev) => prev.map((e) => e.id === entry.id ? updated : e));
      toast.success(updated.isPublic ? t('portfolio.public') : t('portfolio.private'));
    } catch { toast.error(t('error.generic')); }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-amber-600" />
            {t('portfolio.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <Button
          className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('portfolio.add_new')}
        </Button>
      </div>

      {/* Filters & Search */}
      <Card className="border-0 shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('action.search')}
                className="pl-9 rounded-lg h-10"
              />
            </div>
            {/* Type filter */}
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-10 w-40 rounded-lg">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('portfolio.all_types')}</SelectItem>
                {ENTRY_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {t(et.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Tag filter */}
            {allTags.length > 0 && (
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="h-10 w-40 rounded-lg">
                  <Tag className="h-4 w-4 mr-1" />
                  <SelectValue placeholder={t('portfolio.filter_by_tag')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('portfolio.all_types')}</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* View mode toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-2 rounded-md transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${viewMode === 'timeline' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Active filter tags */}
          {(filterType !== 'all' || filterTag) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {filterType !== 'all' && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs cursor-pointer" onClick={() => setFilterType('all')}>
                  {t(getEntryTypeConfig(filterType).labelKey)} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
              {filterTag && (
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs cursor-pointer" onClick={() => setFilterTag('')}>
                  {filterTag} <X className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {filteredEntries.length === 0 && (
        <div className="text-center py-16">
          <Briefcase className="h-12 w-12 text-amber-400 dark:text-amber-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('portfolio.no_entries')}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-xl border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 min-h-[44px]"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('portfolio.add_new')}
          </Button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredEntries.map((entry, i) => {
              const typeConfig = getEntryTypeConfig(entry.entryType);
              const TypeIcon = typeConfig.icon;
              const entryTags: string[] = entry.tags ? (() => { try { return JSON.parse(entry.tags) as string[]; } catch { return []; } })() : [];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  layout
                >
                  <Card className="border-0 shadow-sm rounded-xl hover:shadow-md transition-shadow h-full flex flex-col overflow-hidden">
                    {/* Color bar at top */}
                    <div className={`h-1.5 ${typeConfig.color.replace('text-', 'bg-').split(' ')[0]}`} />
                    <CardHeader className="pb-2 pt-4 px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${typeConfig.color} shrink-0`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-bold truncate">{entry.title}</CardTitle>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{t(typeConfig.labelKey)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => togglePublic(entry)}
                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title={entry.isPublic ? t('portfolio.public') : t('portfolio.private')}
                          >
                            {entry.isPublic ? <Eye className="h-3.5 w-3.5 text-emerald-500" /> : <EyeOff className="h-3.5 w-3.5 text-gray-400" />}
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0 flex-1 flex flex-col">
                      {entry.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">{entry.description}</p>
                      )}
                      {entry.content && (
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 mb-2 italic">&ldquo;{entry.content}&rdquo;</p>
                      )}
                      {entry.competency && (
                        <Badge variant="outline" className="text-[10px] w-fit mb-2">{entry.competency.code}</Badge>
                      )}
                      {entryTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {entryTags.slice(0, 4).map((tag) => (
                            <Badge key={tag} className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 py-0">
                              <Tag className="h-2.5 w-2.5 mr-0.5" />{tag}
                            </Badge>
                          ))}
                          {entryTags.length > 4 && (
                            <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 py-0">+{entryTags.length - 4}</Badge>
                          )}
                        </div>
                      )}
                      <div className="mt-auto flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg min-h-[44px] min-w-[44px] p-0"
                            onClick={() => openEdit(entry)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px] p-0"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Timeline View */}
      {viewMode === 'timeline' && filteredEntries.length > 0 && (
        <div className="relative max-h-[800px] overflow-y-auto scrollbar-education">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-amber-200/50 dark:bg-amber-900/30" />
          <div className="space-y-4">
            {filteredEntries.map((entry, i) => {
              const typeConfig = getEntryTypeConfig(entry.entryType);
              const TypeIcon = typeConfig.icon;
              const entryTags: string[] = entry.tags ? (() => { try { return JSON.parse(entry.tags) as string[]; } catch { return []; } })() : [];
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative flex items-start gap-4 pl-4"
                >
                  <div className={`absolute left-3 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 shrink-0 ${typeConfig.color.replace('text-', 'bg-').split(' ')[0]}`} style={{ zIndex: 1, top: '16px' }} />
                  <div className="ml-6 min-w-0 flex-1">
                    <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${typeConfig.color} shrink-0`}>
                                <TypeIcon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.title}</span>
                              <Badge className={`text-[10px] ${typeConfig.color}`}>{t(typeConfig.labelKey)}</Badge>
                              {entry.isPublic ? (
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]"><Eye className="h-3 w-3 mr-0.5" />{t('portfolio.public')}</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px]"><EyeOff className="h-3 w-3 mr-0.5" />{t('portfolio.private')}</Badge>
                              )}
                            </div>
                            {entry.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{entry.description}</p>
                            )}
                            {entry.content && (
                              <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 italic">&ldquo;{entry.content}&rdquo;</p>
                            )}
                            {entry.competency && (
                              <Badge variant="outline" className="text-[10px] mt-1">{entry.competency.code} — {entry.competency.title}</Badge>
                            )}
                            {entryTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entryTags.map((tag) => (
                                  <Badge key={tag} className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-[10px] px-1.5 py-0">
                                    <Tag className="h-2.5 w-2.5 mr-0.5" />{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-gray-400 mt-2">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(entry.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="rounded-lg min-h-[44px] min-w-[44px] p-0" onClick={() => openEdit(entry)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="rounded-lg text-red-500 hover:text-red-700 min-h-[44px] min-w-[44px] p-0" onClick={() => handleDelete(entry.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? t('portfolio.edit') : t('portfolio.create')}</DialogTitle>
            <DialogDescription>{t('portfolio.title')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">{t('portfolio.entry_title')}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 rounded-lg"
                placeholder={t('portfolio.entry_title')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('portfolio.entry_type')}</Label>
              <Select value={form.entryType} onValueChange={(v) => setForm((f) => ({ ...f, entryType: v }))}>
                <SelectTrigger className="h-10 rounded-lg mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      <span className="flex items-center gap-2">
                        <et.icon className="h-4 w-4" />
                        {t(et.labelKey)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">{t('portfolio.description')}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={2}
                placeholder={t('portfolio.description')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('portfolio.content')}</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                className="mt-1 rounded-lg"
                rows={4}
                placeholder={t('portfolio.content')}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">{t('portfolio.tags')} (comma-separated)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                className="mt-1 rounded-lg"
                placeholder={t('portfolio.tags')}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">{entry.isPublic ? t('portfolio.public') : t('portfolio.private')}</Label>
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-gray-400" />
                <Switch
                  checked={form.isPublic}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isPublic: v }))}
                />
                <Eye className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl min-h-[44px]" onClick={() => setDialogOpen(false)}>{t('action.cancel')}</Button>
            <Button
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]"
              onClick={handleSave}
            >
              {editId ? t('action.save') : t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
