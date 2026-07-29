'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  Lock,
  LockOpen,
  AlertCircle,
  FileText,
  Star,
  BookOpen,
  AlertTriangle,
  Users,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchTeacherNotes,
  createTeacherNote,
  updateTeacherNote,
  deleteTeacherNote,
  type TeacherNote,
  type TeacherNoteCategory,
} from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES: TeacherNoteCategory[] = [
  'GENERAL',
  'BEHAVIOR',
  'ACADEMIC',
  'INTERVENTION',
  'PARENT_CONTACT',
];

const CATEGORY_META: Record<
  TeacherNoteCategory,
  { iconComponent: React.ElementType; color: string; border: string; dot: string; labelKey: string; gradient: string }
> = {
  GENERAL: {
    iconComponent: FileText,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
    border: 'border-l-gray-400 dark:border-l-gray-600',
    dot: 'bg-gray-400 dark:bg-gray-500',
    labelKey: 'teacher_notes.cat_general',
    gradient: 'from-gray-50 to-transparent dark:from-gray-900/20',
  },
  BEHAVIOR: {
    iconComponent: Star,
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    border: 'border-l-amber-400 dark:border-l-amber-600',
    dot: 'bg-amber-400 dark:bg-amber-500',
    labelKey: 'teacher_notes.cat_behavior',
    gradient: 'from-amber-50 to-transparent dark:from-amber-900/15',
  },
  ACADEMIC: {
    iconComponent: BookOpen,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    border: 'border-l-emerald-400 dark:border-l-emerald-600',
    dot: 'bg-emerald-400 dark:bg-emerald-500',
    labelKey: 'teacher_notes.cat_academic',
    gradient: 'from-emerald-50 to-transparent dark:from-emerald-900/15',
  },
  INTERVENTION: {
    iconComponent: AlertTriangle,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    border: 'border-l-rose-400 dark:border-l-rose-600',
    dot: 'bg-rose-400 dark:bg-rose-500',
    labelKey: 'teacher_notes.cat_intervention',
    gradient: 'from-rose-50 to-transparent dark:from-rose-900/15',
  },
  PARENT_CONTACT: {
    iconComponent: Users,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    border: 'border-l-violet-400 dark:border-l-violet-600',
    dot: 'bg-violet-400 dark:bg-violet-500',
    labelKey: 'teacher_notes.cat_parent_contact',
    gradient: 'from-violet-50 to-transparent dark:from-violet-900/15',
  },
};

function relativeTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const wk = Math.floor(day / 7);
  const mo = Math.floor(day / 30);
  const isDe = locale === 'de';
  if (sec < 60) return isDe ? 'gerade eben' : 'just now';
  if (min < 60) return isDe ? `vor ${min} Min.` : `${min}m ago`;
  if (hr < 24) return isDe ? `vor ${hr} Std.` : `${hr}h ago`;
  if (day < 7) return isDe ? `vor ${day} Tg.` : `${day}d ago`;
  if (wk < 5) return isDe ? `vor ${wk} Wo.` : `${wk}w ago`;
  if (mo < 12) return isDe ? `vor ${mo} Mo.` : `${mo}mo ago`;
  return date.toLocaleDateString(isDe ? 'de-DE' : 'en-US');
}

interface TeacherNotesSectionProps {
  studentId: string;
}

export default function TeacherNotesSection({ studentId }: TeacherNotesSectionProps) {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);

  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TeacherNote | null>(null);
  const [formCategory, setFormCategory] = useState<TeacherNoteCategory>('GENERAL');
  const [formContent, setFormContent] = useState('');
  const [formPrivate, setFormPrivate] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<TeacherNoteCategory | 'ALL'>('ALL');

  // Count per category
  const categoryCounts = useMemo(() => {
    const counts: Record<TeacherNoteCategory, number> = {
      GENERAL: 0,
      BEHAVIOR: 0,
      ACADEMIC: 0,
      INTERVENTION: 0,
      PARENT_CONTACT: 0,
    };
    for (const n of notes) {
      counts[n.category] = (counts[n.category] ?? 0) + 1;
    }
    return counts;
  }, [notes]);

  const filteredNotes = useMemo(() => {
    if (filterCategory === 'ALL') return notes;
    return notes.filter((n) => n.category === filterCategory);
  }, [notes, filterCategory]);

  const MAX_CHARS = 1000;
  const formContentLength = formContent.length;

  const loadNotes = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchTeacherNotes(studentId);
      setNotes(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.generic');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const openCreate = () => {
    setEditingNote(null);
    setFormCategory('GENERAL');
    setFormContent('');
    setFormPrivate(true);
    setDialogOpen(true);
  };

  const openEdit = (note: TeacherNote) => {
    setEditingNote(note);
    setFormCategory(note.category);
    setFormContent(note.content);
    setFormPrivate(note.isPrivate);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formContent.trim()) {
      toast.error(t('teacher_notes.error_min_content'));
      return;
    }
    setSaving(true);
    try {
      if (editingNote) {
        const updated = await updateTeacherNote(editingNote.id, {
          category: formCategory,
          content: formContent.trim(),
          isPrivate: formPrivate,
        });
        setNotes((prev) =>
          prev.map((n) => (n.id === editingNote.id ? updated : n))
        );
        toast.success(t('teacher_notes.updated'));
      } else {
        const created = await createTeacherNote({
          studentId,
          category: formCategory,
          content: formContent.trim(),
          isPrivate: formPrivate,
        });
        setNotes((prev) => [created, ...prev]);
        toast.success(t('teacher_notes.created'));
      }
      setDialogOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.generic');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteTeacherNote(deleteId);
      setNotes((prev) => prev.filter((n) => n.id !== deleteId));
      toast.success(t('teacher_notes.deleted'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.generic');
      toast.error(msg);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
      <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            {t('teacher_notes.title')}
            <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium">
              {notes.length}
            </Badge>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
            onClick={openCreate}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t('teacher_notes.add')}
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('teacher_notes.subtitle')}</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10">
            {/* Illustrated empty state */}
            <div className="relative inline-block">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-violet-100 to-emerald-100 dark:from-violet-900/20 dark:to-emerald-900/20 blur-md opacity-60" />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-emerald-100 dark:from-violet-900/40 dark:to-emerald-900/40 mx-auto mb-3 text-violet-500 dark:text-violet-300">
                <MessageSquare className="h-8 w-8" />
                {/* Floating sparkle decoration */}
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-white text-xs flex items-center justify-center shadow-sm"><Sparkles className="w-3 h-3" /></div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('teacher_notes.no_notes')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('teacher_notes.no_notes_hint')}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
              onClick={openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('teacher_notes.add')}
            </Button>
          </div>
        ) : (
          <>
            {/* Filter chips */}
            <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-violet-200/30 dark:border-violet-900/20">
              <button
                onClick={() => setFilterCategory('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filterCategory === 'ALL'
                    ? 'bg-gradient-to-r from-violet-500 to-emerald-500 text-white shadow-sm'
                    : 'bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-gray-200/50 dark:border-gray-700/30'
                }`}
              >
                {t('polish.all_actions')} ({notes.length})
              </button>
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const count = categoryCounts[cat] ?? 0;
                if (count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all inline-flex items-center gap-1 ${
                      filterCategory === cat
                        ? `${meta.color} ring-1 shadow-sm`
                        : 'bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30'
                    }`}
                  >
                    <meta.iconComponent className="w-3 h-3" />
                    {t(meta.labelKey)}
                    <span className={`ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full text-[9px] font-bold ${
                      filterCategory === cat ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative max-h-96 overflow-y-auto scrollbar-education">
              <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-violet-300 via-violet-400 to-violet-300 dark:from-violet-700 dark:via-violet-600 dark:to-violet-700" />
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8 pl-7">
                  <p className="text-sm text-gray-400 dark:text-gray-500">{t('polish.no_results')}</p>
                </div>
              ) : filteredNotes.map((note, i) => {
                const meta = CATEGORY_META[note.category] ?? CATEGORY_META.GENERAL;
                const isOwn = note.teacherId === currentUser?.id;
                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="relative flex items-start gap-3 pl-7 py-2 group"
                  >
                    <div className={`absolute left-2.5 top-3.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900 ${meta.dot}`} style={{ zIndex: 1 }} />
                    <div className={`flex-1 min-w-0 p-3 rounded-lg bg-gradient-to-r ${meta.gradient} border-l-2 ${meta.border}`}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`text-[10px] inline-flex items-center gap-1 ${meta.color}`}>
                          <meta.iconComponent className="w-3 h-3" />
                          {t(meta.labelKey)}
                        </Badge>
                        <span className="text-[11px] text-gray-700 dark:text-gray-300 font-medium">
                          {isOwn ? t('teacher_notes.you') : `${note.teacher.firstName} ${note.teacher.lastName}`}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          · {relativeTime(note.createdAt, locale)}
                        </span>
                        {note.updatedAt !== note.createdAt && (
                          <span className="text-[10px] text-violet-500 dark:text-violet-400 italic">
                            ({t('polish.last_edited')} {relativeTime(note.updatedAt, locale)})
                          </span>
                        )}
                        {note.isPrivate ? (
                          <Lock className="h-3 w-3 text-violet-400" />
                        ) : (
                          <LockOpen className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                      {isOwn && (
                        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-violet-700 dark:text-violet-300 hover:bg-violet-100 dark:hover:bg-violet-900/20"
                            onClick={() => openEdit(note)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            {t('teacher_notes.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                            onClick={() => setDeleteId(note.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {t('teacher_notes.delete')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-violet-200/60 dark:border-violet-900/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-300">
              <MessageSquare className="h-5 w-5" />
              {editingNote ? t('teacher_notes.edit_title') : t('teacher_notes.add_title')}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              {t('teacher_notes.subtitle')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                {t('teacher_notes.category')}
              </Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as TeacherNoteCategory)}>
                <SelectTrigger className="rounded-lg border-violet-200 dark:border-violet-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <SelectItem key={cat} value={cat}>
                        <span className="inline-flex items-center gap-2">
                          <meta.iconComponent className="w-4 h-4" />
                          <span className={`inline-block w-2 h-2 rounded-full ${meta.dot}`} />
                          {t(meta.labelKey)}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {t('teacher_notes.content')}
                </Label>
                <span className={`text-[10px] font-mono ${
                  formContentLength > MAX_CHARS
                    ? 'text-rose-600 dark:text-rose-400 font-bold'
                    : formContentLength > MAX_CHARS * 0.8
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {formContentLength} / {MAX_CHARS}
                </span>
              </div>
              <Textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder={t('teacher_notes.content_placeholder')}
                rows={5}
                className="rounded-lg border-violet-200 dark:border-violet-900/30 resize-none"
              />
              {!formContent.trim() && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('teacher_notes.error_min_content')}
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formPrivate}
                onCheckedChange={(v) => setFormPrivate(v === true)}
              />
              <span className="text-xs text-gray-700 dark:text-gray-300 inline-flex items-center gap-1">
                <Lock className="h-3 w-3 text-violet-400" />
                {t('teacher_notes.private')}
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-xl"
              disabled={saving}
            >
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formContent.trim()}
              className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                </span>
              ) : null}
              {t('teacher_notes.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-rose-200/60 dark:border-rose-900/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
              <Trash2 className="h-5 w-5" />
              {t('teacher_notes.delete')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-500 dark:text-gray-400">
              {t('teacher_notes.delete_confirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            >
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
