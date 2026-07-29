'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Pin,
  Eye,
  Clock,
  Calendar,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  PartyPopper,
  ClipboardCheck,
  Hourglass,
  Info,
  Users,
  Check,
  X,
  Filter,
  ChevronDown,
  RefreshCw,
  Star,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

/* ── Types ─────────────────────────────────────────────────────── */

interface AnnouncementAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

interface AnnouncementRead {
  id: string;
  userId: string;
  readAt: string;
  user: { id: string; firstName: string; lastName: string };
}

interface AnnouncementItem {
  id: string;
  schoolId: string;
  authorId: string;
  title: string;
  content: string;
  priority: string;
  announcementType: string;
  targetAudience: string;
  classGroupId: string | null;
  isPinned: boolean;
  expiresAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  author: AnnouncementAuthor;
  classGroup: { id: string; name: string } | null;
  isReadByCurrentUser?: boolean;
  totalReads?: number;
  reads?: AnnouncementRead[];
}

interface ClassGroup {
  id: string;
  name: string;
}

/* ── Config ────────────────────────────────────────────────────── */

const ANNOUNCEMENT_TYPES = [
  { key: 'general', labelKey: 'announcements.type_general', icon: Megaphone, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'urgent', labelKey: 'announcements.type_urgent', icon: AlertTriangle, gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400' },
  { key: 'event', labelKey: 'announcements.type_event', icon: PartyPopper, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400' },
  { key: 'holiday', labelKey: 'announcements.type_holiday', icon: Star, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
  { key: 'exam', labelKey: 'announcements.type_exam', icon: ClipboardCheck, gradient: 'from-teal-500 to-cyan-500', bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400' },
  { key: 'deadline', labelKey: 'announcements.type_deadline', icon: Hourglass, gradient: 'from-rose-500 to-amber-500', bg: 'bg-rose-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
] as const;

const PRIORITIES = [
  { key: 'low', labelKey: 'announcements.priority_low', badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
  { key: 'normal', labelKey: 'announcements.priority_normal', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { key: 'high', labelKey: 'announcements.priority_high', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { key: 'urgent', labelKey: 'announcements.priority_urgent', badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
] as const;

const TARGET_AUDIENCES = [
  { key: 'all', labelKey: 'announcements.target_all' },
  { key: 'teachers', labelKey: 'announcements.target_teachers' },
  { key: 'students', labelKey: 'announcements.target_students' },
  { key: 'parents', labelKey: 'announcements.target_parents' },
  { key: 'class', labelKey: 'announcements.target_class' },
] as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function getTypeConfig(type: string) {
  return ANNOUNCEMENT_TYPES.find((t) => t.key === type) || ANNOUNCEMENT_TYPES[0];
}

function getPriorityConfig(priority: string) {
  return PRIORITIES.find((p) => p.key === priority) || PRIORITIES[1];
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('announcements.just_now');
  if (diffMin < 60) return t('announcements.minutes_ago').replace('{n}', String(diffMin));
  if (diffHour < 24) return t('announcements.hours_ago').replace('{n}', String(diffHour));
  if (diffDay < 7) return t('announcements.days_ago').replace('{n}', String(diffDay));
  return date.toLocaleDateString();
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

/* ── Component ─────────────────────────────────────────────────── */

export default function SchoolAnnouncementsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState('normal');
  const [formType, setFormType] = useState('general');
  const [formTarget, setFormTarget] = useState('all');
  const [formClassId, setFormClassId] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  const role = currentUser?.role || 'TEACHER';
  const schoolId = currentUser?.schoolId;
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'SUPER_ADMIN' || role === 'VICE_PRINCIPAL';
  const isTeacher = role === 'TEACHER';
  const canCreate = isAdmin || isTeacher;
  const canEdit = isAdmin || isTeacher;

  /* ── Load Data ──────────────────────────────────────────────── */

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    try {
      const params = new URLSearchParams({
        schoolId,
        includeReads: 'true',
        limit: '100',
      });
      if (filterType !== 'all') params.set('announcementType', filterType);
      if (filterPriority !== 'all') params.set('priority', filterPriority);

      const data = await apiGet<AnnouncementItem[]>(`/api/announcements?${params.toString()}`);
      setAnnouncements(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [schoolId, filterType, filterPriority]);

  const loadClasses = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet<ClassGroup[]>(`/api/classes?schoolId=${schoolId}`);
      setClasses(data);
    } catch {
      // ignore
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
    loadClasses();
  }, [loadData, loadClasses]);

  /* ── Actions ────────────────────────────────────────────────── */

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await apiPost(`/api/announcements/${id}/read`, {});
      setAnnouncements((prev) =>
        prev.map((a) => a.id === id ? { ...a, isReadByCurrentUser: true } : a)
      );
    } catch {
      // ignore
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!schoolId || !formTitle.trim() || !formContent.trim()) return;
    setFormSaving(true);
    try {
      await apiPost('/api/announcements', {
        schoolId,
        title: formTitle,
        content: formContent,
        priority: formPriority,
        announcementType: formType,
        targetAudience: formTarget,
        classGroupId: formTarget === 'class' ? formClassId : null,
        isPinned: formIsPinned,
        expiresAt: formExpiresAt || null,
      });
      setCreateOpen(false);
      resetForm();
      loadData();
    } catch {
      // ignore
    } finally {
      setFormSaving(false);
    }
  }, [schoolId, formTitle, formContent, formPriority, formType, formTarget, formClassId, formIsPinned, formExpiresAt, loadData]);

  const handleEdit = useCallback(async () => {
    if (!editId || !formTitle.trim() || !formContent.trim()) return;
    setFormSaving(true);
    try {
      await apiPut(`/api/announcements/${editId}`, {
        title: formTitle,
        content: formContent,
        priority: formPriority,
        announcementType: formType,
        targetAudience: formTarget,
        classGroupId: formTarget === 'class' ? formClassId : null,
        isPinned: formIsPinned,
        expiresAt: formExpiresAt || null,
      });
      setEditId(null);
      resetForm();
      loadData();
    } catch {
      // ignore
    } finally {
      setFormSaving(false);
    }
  }, [editId, formTitle, formContent, formPriority, formType, formTarget, formClassId, formIsPinned, formExpiresAt, loadData]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiDelete(`/api/announcements/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  }, []);

  const handleTogglePin = useCallback(async (id: string, isPinned: boolean) => {
    try {
      await apiPut(`/api/announcements/${id}`, { isPinned: !isPinned });
      setAnnouncements((prev) =>
        prev.map((a) => a.id === id ? { ...a, isPinned: !isPinned } : a)
      );
    } catch {
      // ignore
    }
  }, []);

  const openEdit = useCallback((announcement: AnnouncementItem) => {
    setEditId(announcement.id);
    setFormTitle(announcement.title);
    setFormContent(announcement.content);
    setFormPriority(announcement.priority);
    setFormType(announcement.announcementType);
    setFormTarget(announcement.targetAudience);
    setFormClassId(announcement.classGroupId || '');
    setFormIsPinned(announcement.isPinned);
    setFormExpiresAt(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : '');
  }, []);

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormContent('');
    setFormPriority('normal');
    setFormType('general');
    setFormTarget('all');
    setFormClassId('');
    setFormIsPinned(false);
    setFormExpiresAt('');
  }, []);

  /* ── Sorted Announcements ───────────────────────────────────── */

  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [announcements]);

  /* ── Render ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-gray-500">{t('announcements.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with gradient banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 p-6 shadow-lg"
      >
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/3 w-16 h-16 rounded-full bg-white/5" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Megaphone className="h-6 w-6" />
              {t('announcements.title')}
            </h1>
            <p className="text-sm text-emerald-100 mt-1">
              {t('announcements.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('action.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
            <Filter className="h-4 w-4 mr-1" />
            {t('action.filter')}
            {showFilters ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-md">
                  <Plus className="h-4 w-4 mr-1" />
                  {t('announcements.create')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-emerald-600" />
                    {t('announcements.create_title')}
                  </DialogTitle>
                </DialogHeader>
                <AnnouncementForm
                  title={formTitle} setTitle={setFormTitle}
                  content={formContent} setContent={setFormContent}
                  priority={formPriority} setPriority={setFormPriority}
                  type={formType} setType={setFormType}
                  target={formTarget} setTarget={setFormTarget}
                  classId={formClassId} setClassId={setFormClassId}
                  isPinned={formIsPinned} setIsPinned={setFormIsPinned}
                  expiresAt={formExpiresAt} setExpiresAt={setFormExpiresAt}
                  classes={classes}
                  onSave={handleCreate}
                  saving={formSaving}
                  saveLabel={t('action.create')}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-emerald-200/50 dark:border-emerald-900/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">{t('announcements.filter_type')}</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('announcements.all_types')}</SelectItem>
                        {ANNOUNCEMENT_TYPES.map((type) => (
                          <SelectItem key={type.key} value={type.key}>{t(type.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">{t('announcements.filter_priority')}</Label>
                    <Select value={filterPriority} onValueChange={setFilterPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('announcements.all_priorities')}</SelectItem>
                        {PRIORITIES.map((p) => (
                          <SelectItem key={p.key} value={p.key}>{t(p.labelKey)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) { setEditId(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-600" />
              {t('announcements.edit_title')}
            </DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            title={formTitle} setTitle={setFormTitle}
            content={formContent} setContent={setFormContent}
            priority={formPriority} setPriority={setFormPriority}
            type={formType} setType={setFormType}
            target={formTarget} setTarget={setFormTarget}
            classId={formClassId} setClassId={setFormClassId}
            isPinned={formIsPinned} setIsPinned={setFormIsPinned}
            expiresAt={formExpiresAt} setExpiresAt={setFormExpiresAt}
            classes={classes}
            onSave={handleEdit}
            saving={formSaving}
            saveLabel={t('action.save')}
          />
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-emerald-200/50 dark:border-emerald-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{announcements.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('announcements.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-rose-200/50 dark:border-rose-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <Pin className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {announcements.filter((a) => a.isPinned).length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('announcements.pinned')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-amber-200/50 dark:border-amber-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {announcements.filter((a) => a.priority === 'urgent' || a.priority === 'high').length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('announcements.urgent_high')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-teal-200/50 dark:border-teal-900/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {announcements.filter((a) => !a.isReadByCurrentUser).length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('announcements.unread')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Announcements List */}
      {sortedAnnouncements.length === 0 ? (
        <Card className="border-emerald-200/50 dark:border-emerald-900/30">
          <CardContent className="p-12 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">{t('announcements.no_announcements')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {sortedAnnouncements.map((announcement, index) => {
              const typeConfig = getTypeConfig(announcement.announcementType);
              const priConfig = getPriorityConfig(announcement.priority);
              const TypeIcon = typeConfig.icon;
              const isExpanded = expandedId === announcement.id;

              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  layout
                >
                  <Card className={`overflow-hidden transition-all hover:shadow-lg backdrop-blur-sm bg-card/80 ${
                    announcement.isPinned
                      ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200/50 dark:ring-emerald-800/50'
                      : !announcement.isReadByCurrentUser
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-gray-200 dark:border-gray-800'
                  }`}>
                    {/* Image header area with gradient */}
                    <div className={`h-2 bg-gradient-to-r ${typeConfig.gradient}`} />

                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start gap-4">
                        {/* Type icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${typeConfig.bg}`}>
                          <TypeIcon className={`h-6 w-6 ${typeConfig.text}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                              {announcement.title}
                            </h3>
                            {announcement.isPinned && (
                              <motion.div
                                animate={{ rotate: [0, -10, 10, -10, 0] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                              >
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] shadow-sm">
                                  <Pin className="h-3 w-3 mr-0.5" />
                                  {t('announcements.pinned')}
                                </Badge>
                              </motion.div>
                            )}
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priConfig.badgeColor}`}>
                              {t(priConfig.labelKey)}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                              {t(typeConfig.labelKey)}
                            </Badge>
                            {!announcement.isReadByCurrentUser && (
                              <motion.span
                                className="w-2 h-2 rounded-full bg-emerald-500"
                                animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </div>

                          {/* Author & time */}
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[8px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                {getInitials(announcement.author.firstName, announcement.author.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {announcement.author.firstName} {announcement.author.lastName}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">{formatRelativeTime(announcement.createdAt)}</span>
                            {announcement.targetAudience !== 'all' && (
                              <>
                                <span className="text-xs text-gray-400">·</span>
                                <Users className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-400">
                                  {t(`announcements.target_${announcement.targetAudience}`)}
                                </span>
                              </>
                            )}
                            {announcement.classGroup && (
                              <span className="text-xs text-gray-400">
                                ({announcement.classGroup.name})
                              </span>
                            )}
                            {announcement.expiresAt && (
                              <>
                                <span className="text-xs text-gray-400">·</span>
                                <Calendar className="h-3 w-3 text-gray-400" />
                                <motion.span
                                  className="text-xs text-gray-400 flex items-center gap-1"
                                  animate={new Date(announcement.expiresAt) < new Date(Date.now() + 7 * 86400000) ? { opacity: [1, 0.5, 1] } : {}}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  {t('announcements.expires')} {new Date(announcement.expiresAt).toLocaleDateString()}
                                </motion.span>
                              </>
                            )}
                          </div>

                          {/* Content (truncated unless expanded) */}
                          <p className={`text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap ${
                            !isExpanded ? 'line-clamp-3' : ''
                          }`}>
                            {announcement.content}
                          </p>

                          {announcement.content.length > 200 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                              className="mt-1 text-emerald-600 dark:text-emerald-400 h-7 text-xs"
                            >
                              {isExpanded ? t('announcements.show_less') : t('announcements.show_more')}
                            </Button>
                          )}

                          {/* Read receipts */}
                          {announcement.totalReads !== undefined && announcement.totalReads > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <UserCheck className="h-3 w-3 text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                                {announcement.totalReads} {t('announcements.have_read')}
                              </span>
                              {announcement.reads && announcement.reads.length > 0 && (
                                <div className="flex -space-x-1 ml-1">
                                  {announcement.reads.slice(0, 5).map((r) => (
                                    <Avatar key={r.id} className="h-4 w-4 border border-white dark:border-gray-800">
                                      <AvatarFallback className="text-[6px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                        {getInitials(r.user.firstName, r.user.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {announcement.reads.length > 5 && (
                                    <span className="text-[10px] text-gray-400 ml-1">+{announcement.reads.length - 5}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            {!announcement.isReadByCurrentUser && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkRead(announcement.id)}
                                className="h-7 text-xs text-emerald-600 border-emerald-200 dark:border-emerald-800"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                {t('announcements.mark_read')}
                              </Button>
                            )}
                            {canEdit && (isAdmin || announcement.authorId === currentUser?.id) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                                  className="h-7 text-xs text-emerald-600 dark:text-emerald-400"
                                >
                                  <Pin className="h-3 w-3 mr-1" />
                                  {announcement.isPinned ? t('announcements.unpin') : t('announcements.pin')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(announcement)}
                                  className="h-7 text-xs text-gray-600 dark:text-gray-400"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  {t('action.edit')}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(announcement.id)}
                                  className="h-7 text-xs text-rose-600 dark:text-rose-400"
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  {t('action.delete')}
                                </Button>
                              </>
                            )}
                          </div>
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
    </div>
  );
}

/* ── Announcement Form Sub-component ───────────────────────────── */

function AnnouncementForm({
  title, setTitle,
  content, setContent,
  priority, setPriority,
  type, setType,
  target, setTarget,
  classId, setClassId,
  isPinned, setIsPinned,
  expiresAt, setExpiresAt,
  classes,
  onSave,
  saving,
  saveLabel,
}: {
  title: string;
  setTitle: (v: string) => void;
  content: string;
  setContent: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  type: string;
  setType: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
  classId: string;
  setClassId: (v: string) => void;
  isPinned: boolean;
  setIsPinned: (v: boolean) => void;
  expiresAt: string;
  setExpiresAt: (v: string) => void;
  classes: ClassGroup[];
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">{t('announcements.field_title')}</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('announcements.field_title_placeholder')}
          className="mt-1"
        />
      </div>

      <div>
        <Label className="text-sm font-medium">{t('announcements.field_content')}</Label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('announcements.field_content_placeholder')}
          className="mt-1 min-h-[120px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">{t('announcements.field_type')}</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANNOUNCEMENT_TYPES.map((at) => (
                <SelectItem key={at.key} value={at.key}>{t(at.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-medium">{t('announcements.field_priority')}</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.key} value={p.key}>{t(p.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">{t('announcements.field_target')}</Label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_AUDIENCES.map((a) => (
                <SelectItem key={a.key} value={a.key}>{t(a.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {target === 'class' && (
          <div>
            <Label className="text-sm font-medium">{t('announcements.field_class')}</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          <Label className="text-sm">{t('announcements.pin_to_top')}</Label>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">{t('announcements.field_expiry')}</Label>
        <Input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="mt-1"
        />
      </div>

      <Button
        onClick={onSave}
        disabled={saving || !title.trim() || !content.trim()}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {saving ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
}
